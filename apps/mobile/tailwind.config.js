const baseConfig = require("@budnet/config/tailwind");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: ["./app/**/*.{ts,tsx}", "../../packages/ui/src/native/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
};
