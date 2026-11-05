// @ts-check

import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import { defineConfig, envField, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";
import { PHOTO_HOSTS } from "./src/lib/photoHosts";
import { rehypeImageAttributes } from "./src/lib/rehypeImageAttributes";

// https://astro.build/config
export default defineConfig({
  site: "https://v6.yuanhau.com",
  output: "server",
  adapter: vercel(),
  integrations: [mdx(), sitemap(), react()],
  // Admin panel secrets (read at runtime on the server, never sent to the browser).
  env: {
    schema: {
      // Hex SHA-512 of the admin password: `printf %s 'password' | shasum -a 512`
      ADMIN_PASSWORD_SHA512: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // Random string used to sign the admin session cookie.
      ADMIN_SESSION_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // Shared with Convex (`npx convex env set ADMIN_API_SECRET ...`) for admin-only functions.
      ADMIN_API_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // S3-compatible storage (Cloudflare R2, MinIO, ...) for admin uploads. Browsers upload
      // straight to it with presigned URLs, so the bucket needs CORS for PUT from this site.
      // R2: https://<account id>.r2.cloudflarestorage.com with S3_REGION=auto
      S3_ENDPOINT: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      S3_REGION: envField.string({
        context: "server",
        access: "secret",
        default: "us-east-1",
      }),
      S3_BUCKET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      S3_ACCESS_KEY_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      S3_SECRET_ACCESS_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // Public base URL objects are served from (R2: the bucket's custom domain or r2.dev URL)
      S3_PUBLIC_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  image: {
    domains: PHOTO_HOSTS,
  },
  markdown: {
    processor: unified({ rehypePlugins: [rehypeImageAttributes] }),
  },

  fonts: [
    {
      provider: fontProviders.local(),
      name: "Atkinson",
      cssVariable: "--font-atkinson",
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/atkinson-regular.woff"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/atkinson-bold.woff"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
