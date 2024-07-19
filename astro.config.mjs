import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import prefetch from "@astrojs/prefetch";
import sitemap from "@astrojs/sitemap";
import matomo from 'astro-matomo';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), prefetch(), sitemap()],
  site: 'https://wizzard.site',
  base: '/'
});