import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "./db";
import { baUser, baSession, baAccount, baVerification } from "./db/schema";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: [process.env.WEB_URL ?? "http://localhost:5173"],
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-in-production",

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: baUser,
      session: baSession,
      account: baAccount,
      verification: baVerification,
    },
  }),

  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (process.env.NODE_ENV !== "production") {
          console.log(`\n🔗 Magic link for ${email}:\n${url}\n`);
          return;
        }
        if (!resend) throw new Error("RESEND_API_KEY not set");
        await resend.emails.send({
          from: "budnet <noreply@budnet.app>",
          to: email,
          subject: "Sign in to budnet",
          html: `<p>Click the link below to sign in:</p><p><a href="${url}">${url}</a></p><p>Link expires in 5 minutes.</p>`,
        });
      },
    }),
  ],

});
