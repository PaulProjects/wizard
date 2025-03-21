import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import prefetch from "@astrojs/prefetch";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), prefetch(),
    sitemap({
			filter: (page) =>
				page == "https://wizard.paulbertram.de/"
		}),
  ],
  site: 'https://wizard.paulbertram.de',
});
