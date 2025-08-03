import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), 
    sitemap({
			filter: (page) =>
				page == "https://wizard.paulbertram.de/"
		}),
    icon({
      include: {
        mdi: ["*"], // Include all Material Design Icons
        mi: ["*"]   // Include all Minimal Icons
      }
    }),
  ],
  site: 'https://wizard.paulbertram.de',
});
