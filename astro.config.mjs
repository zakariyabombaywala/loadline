// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import interactionDirective from './src/directives/integration.ts';

export default defineConfig({
  site: 'https://loadline.pages.dev',
  output: 'static',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  integrations: [react(), sitemap(), interactionDirective()],
  build: {
    // The whole stylesheet is small; inlining it removes the only render-blocking request.
    inlineStylesheets: 'always',
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument-sans',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          {
            src: ['@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2'],
            weight: '400 700',
            style: 'normal',
            display: 'swap',
          },
        ],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
