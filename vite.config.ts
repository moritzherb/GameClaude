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

/**
 * The store app's copy (`npm run build:app`): the whole app in one HTML file, script, styles,
 * fonts and pictures inside, so the app shows it offline from its own bundle. Also written as a
 * module (html.js) the React Native side imports. No home-screen icons, start-up images, manifest or
 * service worker: the app is the app.
 */
function singleFile(): Plugin {
  return {
    name: 'single-file',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/\s*<link rel="(icon|apple-touch-icon|apple-touch-startup-image|manifest)"[^>]*>/g, '').replace(/\s*<meta name="(apple-mobile-web-app-[a-z-]+|mobile-web-app-capable)"[^>]*>/g, '');
    },
    generateBundle(_options, bundle) {
      const page = bundle['index.html'];
      if (!page || page.type !== 'asset') throw new Error('single-file: no index.html');
      let html = String(page.source);
      for (const [name, file] of Object.entries(bundle)) {
        const tag = (attr: 'src' | 'href') => new RegExp(`<(script|link)[^>]*${attr}="\\./${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>(</script>)?`);
        if (file.type === 'chunk') {
          if (!file.isEntry) throw new Error(`single-file: a second script chunk (${name})`);
          const code = file.code.replace(/<\/(script)/gi, '<\\/$1');
          html = html.replace(tag('src'), () => `<script type="module">${code}</script>`);
          delete bundle[name];
        } else if (name.endsWith('.css')) {
          html = html.replace(tag('href'), () => `<style>${String(file.source)}</style>`);
          delete bundle[name];
        }
      }
      const left = Object.keys(bundle).filter((n) => n !== 'index.html');
      if (left.length) throw new Error(`single-file: files left outside the page: ${left.join(', ')}`);
      if (/<(script|link)[^>]+(src|href)="\.\//.test(html)) throw new Error('single-file: the page still points at a file');
      page.source = html;
      this.emitFile({ type: 'asset', fileName: 'html.js', source: `// Made by \`npm run build:app\` (vite.config.ts). Don't edit.\nexport default ${JSON.stringify(html)};\n` });
      this.emitFile({ type: 'asset', fileName: 'html.d.ts', source: 'declare const html: string;\nexport default html;\n' });
    },
  };
}

// Relative base so the build works from any folder (GitHub Pages, Netlify, a USB stick...).
export default defineConfig(({ mode }) =>
  mode === 'app'
    ? {
        base: './',
        publicDir: false,
        plugins: [react(), singleFile()],
        build: {
          outDir: 'mobile/web',
          emptyOutDir: true,
          // Everything inside the page: fonts and pictures as data: addresses.
          assetsInlineLimit: () => true,
          cssCodeSplit: false,
          modulePreload: false,
          chunkSizeWarningLimit: 4000,
          // One script: what the web build loads on its own (the 3D box) is inside it here.
          rollupOptions: { output: { codeSplitting: false } },
        },
      }
    : {
        base: './',
        plugins: [react(), preloadFonts()],
        server: { host: true },
      },
);
