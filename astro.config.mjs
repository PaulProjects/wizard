import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import prefetch from "@astrojs/prefetch";
import sitemap from "@astrojs/sitemap";
import matomo from 'astro-matomo';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), prefetch(), sitemap(), matomo({
    enabled: true,
    host: "https://paulbertram.de/wa/",
    trackerUrl: "js/", // defaults to matomo.php
    srcUrl: "js/", // defaults to matomo.js
    siteId: 2,
    heartBeatTimer: 5,
    disableCookies: true,
  }),],
  site: 'https://wizzard.site',
  base: '/'
});