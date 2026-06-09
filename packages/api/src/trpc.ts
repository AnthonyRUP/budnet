import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient as createVanillaClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./types";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient(baseUrl: string) {
  return createVanillaClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
      }),
    ],
  });
}
