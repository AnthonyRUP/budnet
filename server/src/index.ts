import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./router";
import { createContext } from "./trpc";
import { auth } from "./auth";
import { initSocketIO } from "./socket";

const fastify = Fastify({ logger: true });
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

// Socket.io attaches to Fastify's underlying http.Server
initSocketIO(fastify.server, corsOrigin);

await fastify.register(cors, {
  origin: corsOrigin,
  credentials: true,
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
