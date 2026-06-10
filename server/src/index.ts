import Fastify from "fastify";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { fromNodeHeaders } from "better-auth/node";
import { appRouter } from "./router";
import { createContext } from "./trpc";
import { auth } from "./auth";
import { initSocketIO } from "./socket";

const fastify = Fastify({ logger: true });
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

// Uploads directory — dev local storage
const UPLOADS_DIR = join(process.cwd(), "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

// Socket.io attaches to Fastify's underlying http.Server
initSocketIO(fastify.server, corsOrigin);

await fastify.register(cors, { origin: corsOrigin, credentials: true });

// Encapsulate multipart in its own plugin scope so it doesn't affect tRPC or auth routes
await fastify.register(async function uploadPlugin(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 }, attachFieldsToBody: false });

  app.post("/api/upload", async (request, reply) => {
    const headers = fromNodeHeaders(request.headers);
    const session = await auth.api.getSession({ headers });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });

    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No file provided" });

    const ext = data.filename.split(".").pop()?.toLowerCase() ?? "bin";
    const safeName = `${randomUUID()}.${ext}`;
    const buffer = await data.toBuffer();

    await writeFile(join(UPLOADS_DIR, safeName), buffer);

    const baseUrl = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    return {
      url: `${baseUrl}/api/files/${safeName}`,
      filename: data.filename,
      mimeType: data.mimetype,
      size: buffer.length,
    };
  });
});

// Serve uploaded files
const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", pdf: "application/pdf",
  txt: "text/plain", mp4: "video/mp4", mp3: "audio/mpeg", zip: "application/zip",
};
fastify.get("/api/files/:filename", async (request, reply) => {
  const { filename } = request.params as { filename: string };
  if (!/^[\w.-]+$/.test(filename)) return reply.status(400).send({ error: "Invalid filename" });
  try {
    const buffer = await readFile(join(UPLOADS_DIR, filename));
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    reply.header("Content-Type", MIME[ext] ?? "application/octet-stream");
    reply.header("Cache-Control", "public, max-age=31536000");
    return reply.send(buffer);
  } catch {
    return reply.status(404).send({ error: "Not found" });
  }
});

// Better Auth — wildcard route converts Fastify ↔ Web API Request/Response
fastify.all("/api/auth/*", async (request, reply) => {
  const baseUrl = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  const url = `${baseUrl}${request.url}`;

  const headers = new Headers();
  Object.entries(request.headers).forEach(([key, value]) => {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
  });
  headers.delete("content-length");

  const isBodyMethod = !["GET", "HEAD"].includes(request.method);
  const bodyText = isBodyMethod && request.body != null ? JSON.stringify(request.body) : undefined;

  const webRequest = new Request(url, {
    method: request.method,
    headers,
    body: bodyText,
  });

  const response = await auth.handler(webRequest);

  reply.status(response.status);
  response.headers.forEach((value, key) => {
    reply.header(key, value);
  });

  return reply.send(await response.text());
});

await fastify.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: { router: appRouter, createContext },
});

const port = Number(process.env.PORT ?? 3001);
fastify.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${port}`);
});
