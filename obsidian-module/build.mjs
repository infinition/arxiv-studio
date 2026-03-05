import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const webappDir = resolve(__dirname, 'webapp');
const skipWebBuild = process.argv.includes('--skip-web-build');

if (!skipWebBuild) {
  execSync('npm run build:web', { cwd: root, stdio: 'inherit' });
}

if (!existsSync(distDir)) {
  throw new Error('dist folder not found. Run web build first.');
}

rmSync(webappDir, { recursive: true, force: true });
mkdirSync(webappDir, { recursive: true });
cpSync(distDir, webappDir, { recursive: true });
buildEmbeddedHtml();

await build({
  entryPoints: [resolve(__dirname, 'main.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'main.js'),
  format: 'cjs',
  platform: 'browser',
  external: ['obsidian'],
  target: ['es2020'],
  sourcemap: false,
});

console.log('Obsidian module built.');

function buildEmbeddedHtml() {
  const indexPath = resolve(webappDir, 'index.html');
  let html = readFileSync(indexPath, 'utf8');

  const cssRefs = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\.\/assets\/[^"]+\.css)"[^>]*>/g)];
  const inlineCssBlocks = [];
  for (const ref of cssRefs) {
    const rel = ref[1];
    const abs = resolve(webappDir, rel);
    const css = sanitizeInlineCss(readFileSync(abs, 'utf8'));
    inlineCssBlocks.push(`<style>\n${css}\n</style>`);
    html = html.replace(ref[0], () => '');
  }

  const jsRefs = [...html.matchAll(/<script[^>]*type="module"[^>]*src="(\.\/assets\/[^"]+\.js)"[^>]*><\/script>/g)];
  const inlineJsBlocks = [];
  for (const ref of jsRefs) {
    const rel = ref[1];
    const abs = resolve(webappDir, rel);
    const js = sanitizeInlineJs(readFileSync(abs, 'utf8'));
    inlineJsBlocks.push(js);
    html = html.replace(ref[0], () => '');
  }

  // Remove favicon + modulepreload links to avoid blocked app:// asset requests in embedded runtime.
  html = html.replace(/<link[^>]+rel="icon"[^>]*>\s*/g, '');
  html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>\s*/g, '');

  if (inlineCssBlocks.length) {
    html = html.replace('</head>', () => `${inlineCssBlocks.join('\n')}\n  </head>`);
  }

  if (inlineJsBlocks.length) {
    const inlineJs = inlineJsBlocks.join('\n');
    html = html.replace('</body>', () => `    <script type="module">\n${inlineJs}\n</script>\n  </body>`);
  }

  writeFileSync(resolve(webappDir, 'embedded.html'), html, 'utf8');
}

function sanitizeInlineJs(code) {
  return code
    // Avoid breaking out of inline <script> tag.
    .replace(/<\/script/gi, '<\\/script')
    // Remove source-map hints to avoid blocked app:// requests.
    .replace(/\/\/# sourceMappingURL=.*$/gm, '')
    .replace(/\/\*# sourceMappingURL=.*?\*\//g, '');
}

function sanitizeInlineCss(code) {
  return code
    .replace(/<\/style/gi, '<\\/style')
    .replace(/\/\*# sourceMappingURL=.*?\*\//g, '');
}
