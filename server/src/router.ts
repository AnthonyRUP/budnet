import { z } from "zod";
import { eq, and, desc, lt, ne, inArray, getTableColumns } from "drizzle-orm";

function groupReactions(reactions: { emoji: string; userId: string }[]) {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const users = map.get(r.emoji) ?? [];
    users.push(r.userId);
    map.set(r.emoji, users);
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }));
}
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "./trpc";
import { db, schema } from "./db";
import { getIO } from "./socket";

const authRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select()
      .from(schema.baUser)
      .where(eq(schema.baUser.id, ctx.userId))
      .limit(1);
    return user ?? null;
  }),
});

const workspaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({ workspace: schema.workspaces })
      .from(schema.workspaces)
      .innerJoin(
        schema.workspaceMembers,
        eq(schema.workspaceMembers.workspaceId, schema.workspaces.id),
      )
      .where(eq(schema.workspaceMembers.userId, ctx.userId))
      .then((rows) => rows.map((r) => r.workspace));
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), slug: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [workspace] = await db
        .insert(schema.workspaces)
        .values({ name: input.name, slug: input.slug, createdBy: ctx.userId })
        .returning();

      await db.insert(schema.workspaceMembers).values({
        workspaceId: workspace.id,
        userId: ctx.userId,
        role: "owner",
      });

      return workspace;
    }),

  members: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return db
        .select({
          id: schema.baUser.id,
          name: schema.baUser.name,
          email: schema.baUser.email,
          image: schema.baUser.image,
        })
        .from(schema.workspaceMembers)
        .innerJoin(schema.baUser, eq(schema.baUser.id, schema.workspaceMembers.userId))
        .where(and(
          eq(schema.workspaceMembers.workspaceId, input.workspaceId),
          ne(schema.workspaceMembers.userId, ctx.userId),
        ));
    }),

  // Idempotent first-run setup: returns existing workspace or creates one with #general
  init: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await db
      .select({ workspace: schema.workspaces })
      .from(schema.workspaces)
      .innerJoin(schema.workspaceMembers, eq(schema.workspaceMembers.workspaceId, schema.workspaces.id))
      .where(eq(schema.workspaceMembers.userId, ctx.userId))
      .limit(1);

    if (existing.length > 0) return existing[0].workspace;

    const [workspace] = await db
      .insert(schema.workspaces)
      .values({ name: "My Workspace", slug: `ws-${Date.now()}`, createdBy: ctx.userId })
      .returning();

    await db.insert(schema.workspaceMembers).values({
      workspaceId: workspace.id,
      userId: ctx.userId,
      role: "owner",
    });

    const [channel] = await db
      .insert(schema.channels)
      .values({ workspaceId: workspace.id, name: "general", isPrivate: false, createdBy: ctx.userId })
      .returning();

    await db.insert(schema.channelMembers).values({ channelId: channel.id, userId: ctx.userId });

    return workspace;
  }),
});

const channelRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return db
        .select({ channel: schema.channels })
        .from(schema.channels)
        .innerJoin(
          schema.channelMembers,
          eq(schema.channelMembers.channelId, schema.channels.id),
        )
        .where(
          and(
            eq(schema.channels.workspaceId, input.workspaceId),
            eq(schema.channelMembers.userId, ctx.userId),
            eq(schema.channels.isDm, false),
          ),
        )
        .then((rows) => rows.map((r) => r.channel));
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        isPrivate: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [channel] = await db
        .insert(schema.channels)
        .values({
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
          isPrivate: input.isPrivate,
          createdBy: ctx.userId,
        })
        .returning();

      await db.insert(schema.channelMembers).values({
        channelId: channel.id,
        userId: ctx.userId,
      });

      return channel;
    }),

  update: protectedProcedure
    .input(z.object({
      channelId: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;

      const [channel] = await db
        .update(schema.channels)
        .set(updates)
        .where(and(eq(schema.channels.id, input.channelId), eq(schema.channels.createdBy, ctx.userId)))
        .returning();

      if (!channel) throw new TRPCError({ code: "FORBIDDEN", message: "Channel not found or insufficient permissions" });
      return channel;
    }),

  delete: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [channel] = await db
        .delete(schema.channels)
        .where(and(eq(schema.channels.id, input.channelId), eq(schema.channels.createdBy, ctx.userId)))
        .returning();

      if (!channel) throw new TRPCError({ code: "FORBIDDEN", message: "Channel not found or insufficient permissions" });
      return channel;
    }),
});

const messageRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ input }) => {
      const where = input.cursor
        ? and(
            eq(schema.messages.channelId, input.channelId),
            lt(schema.messages.createdAt, new Date(input.cursor)),
          )
        : eq(schema.messages.channelId, input.channelId);

      const rows = await db
        .select({
          ...getTableColumns(schema.messages),
          authorName: schema.baUser.name,
          authorEmail: schema.baUser.email,
          authorImage: schema.baUser.image,
        })
        .from(schema.messages)
        .leftJoin(schema.baUser, eq(schema.messages.authorId, schema.baUser.id))
        .where(where)
        .orderBy(desc(schema.messages.createdAt))
        .limit(input.limit);

      const messageIds = rows.map((r) => r.id);

      const [allReactions, allAttachments] = await Promise.all([
        messageIds.length
          ? db.select().from(schema.messageReactions).where(inArray(schema.messageReactions.messageId, messageIds))
          : Promise.resolve([]),
        messageIds.length
          ? db.select().from(schema.attachments).where(inArray(schema.attachments.messageId, messageIds))
          : Promise.resolve([]),
      ]);

      const nextCursor =
        rows.length === input.limit
          ? rows[rows.length - 1].createdAt.toISOString()
          : undefined;

      const messages = rows.reverse().map((row) => ({
        ...row,
        reactions: groupReactions(allReactions.filter((r) => r.messageId === row.id)),
        attachments: allAttachments.filter((a) => a.messageId === row.id),
      }));

      return { messages, nextCursor };
    }),

  send: protectedProcedure
    .input(z.object({
      channelId: z.string(),
      content: z.string(),
      attachments: z.array(z.object({
        url: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
      })).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.content.trim() && !input.attachments.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message must have content or attachments" });
      }

      const [message] = await db
        .insert(schema.messages)
        .values({
          channelId: input.channelId,
          authorId: ctx.userId,
          content: input.content,
        })
        .returning();

      const savedAttachments = input.attachments.length
        ? await db.insert(schema.attachments).values(
            input.attachments.map((a) => ({ messageId: message.id, ...a }))
          ).returning()
        : [];

      getIO()?.to(`channel:${input.channelId}`).emit("message:new", {
        ...message,
        editedAt: message.editedAt ?? undefined,
        attachments: savedAttachments,
        reactions: [],
      });

      return message;
    }),

  update: protectedProcedure
    .input(z.object({ messageId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [message] = await db
        .update(schema.messages)
        .set({ content: input.content, editedAt: new Date() })
        .where(and(eq(schema.messages.id, input.messageId), eq(schema.messages.authorId, ctx.userId)))
        .returning();

      if (!message) throw new TRPCError({ code: "FORBIDDEN", message: "Message not found or not yours" });

      getIO()?.to(`channel:${message.channelId}`).emit("message:updated", {
        ...message,
        editedAt: message.editedAt ?? undefined,
        attachments: [],
        reactions: [],
      });

      return message;
    }),

  delete: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [message] = await db
        .delete(schema.messages)
        .where(and(eq(schema.messages.id, input.messageId), eq(schema.messages.authorId, ctx.userId)))
        .returning();

      if (!message) throw new TRPCError({ code: "FORBIDDEN", message: "Message not found or not yours" });

      getIO()?.to(`channel:${message.channelId}`).emit("message:deleted", message.id);

      return message;
    }),

  react: protectedProcedure
    .input(z.object({ messageId: z.string(), channelId: z.string(), emoji: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Toggle: try insert; if conflict (already reacted), delete instead
      const [inserted] = await db
        .insert(schema.messageReactions)
        .values({ messageId: input.messageId, userId: ctx.userId, emoji: input.emoji })
        .onConflictDoNothing()
        .returning();

      if (!inserted) {
        await db
          .delete(schema.messageReactions)
          .where(and(
            eq(schema.messageReactions.messageId, input.messageId),
            eq(schema.messageReactions.userId, ctx.userId),
            eq(schema.messageReactions.emoji, input.emoji),
          ));
      }

      const reactions = await db
        .select()
        .from(schema.messageReactions)
        .where(eq(schema.messageReactions.messageId, input.messageId));

      const grouped = groupReactions(reactions);

      getIO()?.to(`channel:${input.channelId}`).emit("message:reaction", {
        messageId: input.messageId,
        reactions: grouped,
      });

      return grouped;
    }),
});

const dmRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // DM channels the current user belongs to
      const myDmChannelIds = await db
        .select({ channelId: schema.channelMembers.channelId })
        .from(schema.channelMembers)
        .innerJoin(schema.channels, eq(schema.channels.id, schema.channelMembers.channelId))
        .where(and(
          eq(schema.channelMembers.userId, ctx.userId),
          eq(schema.channels.isDm, true),
          eq(schema.channels.workspaceId, input.workspaceId),
        ))
        .then((rows) => rows.map((r) => r.channelId));

      if (myDmChannelIds.length === 0) return [];

      // Other participants in those channels
      const participants = await db
        .select({
          channelId: schema.channelMembers.channelId,
          id: schema.baUser.id,
          name: schema.baUser.name,
          email: schema.baUser.email,
          image: schema.baUser.image,
        })
        .from(schema.channelMembers)
        .innerJoin(schema.baUser, eq(schema.baUser.id, schema.channelMembers.userId))
        .where(and(
          inArray(schema.channelMembers.channelId, myDmChannelIds),
          ne(schema.channelMembers.userId, ctx.userId),
        ));

      return myDmChannelIds.map((channelId) => ({
        channelId,
        participants: participants.filter((p) => p.channelId === channelId),
      }));
    }),

  findOrCreate: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      memberIds: z.array(z.string()).min(1).max(7),
    }))
    .mutation(async ({ ctx, input }) => {
      const allMemberIds = [...new Set([ctx.userId, ...input.memberIds])].sort();

      // Look for existing DM with exactly these members
      const candidates = await db
        .select({ channelId: schema.channelMembers.channelId })
        .from(schema.channelMembers)
        .innerJoin(schema.channels, eq(schema.channels.id, schema.channelMembers.channelId))
        .where(and(
          eq(schema.channelMembers.userId, ctx.userId),
          eq(schema.channels.isDm, true),
          eq(schema.channels.workspaceId, input.workspaceId),
        ));

      for (const { channelId } of candidates) {
        const members = await db
          .select({ userId: schema.channelMembers.userId })
          .from(schema.channelMembers)
          .where(eq(schema.channelMembers.channelId, channelId));

        const sorted = members.map((m) => m.userId).sort();
        if (sorted.length === allMemberIds.length && sorted.every((id, i) => id === allMemberIds[i])) {
          return { channelId, isNew: false };
        }
      }

      // Create new DM channel
      const [channel] = await db
        .insert(schema.channels)
        .values({
          workspaceId: input.workspaceId,
          name: "",
          isDm: true,
          isPrivate: true,
          createdBy: ctx.userId,
        })
        .returning();

      for (const userId of allMemberIds) {
        await db.insert(schema.channelMembers).values({ channelId: channel.id, userId });
      }

      return { channelId: channel.id, isNew: true };
    }),
});

const inviteRouter = router({
  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      expiresInDays: z.number().optional(),
      maxUses: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const [invite] = await db
        .insert(schema.invites)
        .values({
          workspaceId: input.workspaceId,
          token,
          createdBy: ctx.userId,
          expiresAt,
          maxUses: input.maxUses,
        })
        .returning();

      return invite;
    }),

  get: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const [invite] = await db
        .select()
        .from(schema.invites)
        .where(eq(schema.invites.token, input.token))
        .limit(1);

      if (!invite) return null;

      const [workspace] = await db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, invite.workspaceId))
        .limit(1);

      const [creator] = await db
        .select({ name: schema.baUser.name })
        .from(schema.baUser)
        .where(eq(schema.baUser.id, invite.createdBy))
        .limit(1);

      const isExpired = !!invite.expiresAt && invite.expiresAt < new Date();
      const isExhausted = !!invite.maxUses && invite.useCount >= invite.maxUses;

      return {
        workspace: workspace ?? null,
        creatorName: creator?.name ?? null,
        isExpired,
        isExhausted,
        valid: !!workspace && !isExpired && !isExhausted,
      };
    }),

  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [invite] = await db
        .select()
        .from(schema.invites)
        .where(eq(schema.invites.token, input.token))
        .limit(1);

      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      if (invite.expiresAt && invite.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has expired" });
      if (invite.maxUses && invite.useCount >= invite.maxUses) throw new TRPCError({ code: "BAD_REQUEST", message: "Invite link has reached its use limit" });

      // Already a member — just return the workspace
      const [existing] = await db
        .select()
        .from(schema.workspaceMembers)
        .where(and(eq(schema.workspaceMembers.workspaceId, invite.workspaceId), eq(schema.workspaceMembers.userId, ctx.userId)))
        .limit(1);

      const [workspace] = await db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, invite.workspaceId))
        .limit(1);

      if (existing) return { workspace, alreadyMember: true };

      await db.insert(schema.workspaceMembers).values({
        workspaceId: invite.workspaceId,
        userId: ctx.userId,
        role: "member",
      });

      await db.update(schema.invites)
        .set({ useCount: invite.useCount + 1 })
        .where(eq(schema.invites.id, invite.id));

      // Auto-join all public channels in the workspace
      const publicChannels = await db
        .select()
        .from(schema.channels)
        .where(and(eq(schema.channels.workspaceId, invite.workspaceId), eq(schema.channels.isPrivate, false)));

      for (const ch of publicChannels) {
        await db.insert(schema.channelMembers)
          .values({ channelId: ch.id, userId: ctx.userId })
          .onConflictDoNothing();
      }

      return { workspace, alreadyMember: false };
    }),
});

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  channel: channelRouter,
  message: messageRouter,
  dm: dmRouter,
  invite: inviteRouter,
});

export type AppRouter = typeof appRouter;
