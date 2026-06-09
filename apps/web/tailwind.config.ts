import type { Config } from "tailwindcss";
import baseConfig from "@budnet/config/tailwind";

export default {
  ...baseConfig,
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/web/**/*.{ts,tsx}"],
} satisfies Config;
