import { z } from "zod";
import { eq, and, desc, lt } from "drizzle-orm";
import { router, protectedProcedure } from "./trpc";
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
          ),
        )
        .then((rows) => rows.map((r) => r.channel));
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1),
        isPrivate: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [channel] = await db
        .insert(schema.channels)
        .values({
          workspaceId: input.workspaceId,
          name: input.name,
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

      const messages = await db
        .select()
        .from(schema.messages)
        .where(where)
        .orderBy(desc(schema.messages.createdAt))
        .limit(input.limit);

      const nextCursor =
        messages.length === input.limit
          ? messages[messages.length - 1].createdAt.toISOString()
          : undefined;

      return { messages: messages.reverse(), nextCursor };
    }),

  send: protectedProcedure
    .input(z.object({ channelId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [message] = await db
        .insert(schema.messages)
        .values({
          channelId: input.channelId,
          authorId: ctx.userId,
          content: input.content,
        })
        .returning();

      getIO()?.to(`channel:${input.channelId}`).emit("message:new", {
        ...message,
        editedAt: message.editedAt ?? undefined,
        attachments: [],
        reactions: [],
      });

      return message;
    }),
});

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  channel: channelRouter,
  message: messageRouter,
});

export type AppRouter = typeof appRouter;
