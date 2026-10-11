import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Fetch the two fonts (their Latin part: English, German) right away, side by side with the
 * app's script, instead of only once the styles ask for them. With them at hand on the first
 * picture, nothing starts out in a wide stand-in font and then jumps.
 */
function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml(_html, ctx) {
      const fonts = Object.keys(ctx.bundle ?? {}).filter((f) => /\/(archivo|big-shoulders-display)-latin-wght-normal-[^/]+\.woff2$/.test(f));
      return fonts.map((f) => ({
        tag: 'link',
        attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `./${f}` },
        injectTo: 'head' as const,
      }));
    },
  };
}

// Relative base so the build works from any folder (GitHub Pages, Netlify, a USB stick...).
export default defineConfig({
  base: './',
  plugins: [react(), preloadFonts()],
  server: { host: true },
});
