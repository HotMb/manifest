import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, '../..');
const outputDir = join(packageDir, 'dist/package');
const bundledServer = join(outputDir, 'server/services/api/dist/main.mjs');
const bundledHtml = join(outputDir, 'server/apps/editor-web/dist/index.html');
const minimumNodeMajor = 24;

if (Number(process.versions.node.split('.')[0]) < minimumNodeMajor) {
  throw new Error(`Manifest Desktop demande Node.js ${minimumNodeMajor} ou plus.`);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(dirname(bundledServer), { recursive: true });
await mkdir(dirname(bundledHtml), { recursive: true });

await build({
  absWorkingDir: repoRoot,
  entryPoints: ['services/api/src/main.ts'],
  outfile: bundledServer,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'bundle',
  sourcemap: false,
  legalComments: 'none',
});

await cp(join(repoRoot, 'apps/editor-web/dist/index.html'), bundledHtml);
await cp(join(packageDir, 'plugin.json'), join(outputDir, 'plugin.json'));
await cp(join(packageDir, 'mcp.json'), join(outputDir, 'mcp.json'));

const manifest = JSON.parse(await readFile(join(outputDir, 'plugin.json'), 'utf8'));
const mcp = JSON.parse(await readFile(join(outputDir, 'mcp.json'), 'utf8'));
if (manifest.name !== 'manifest-desktop' || mcp.mcpServers?.['manifest-local']?.type !== 'stdio') {
  throw new Error('Les manifestes du package local ne correspondent pas au serveur MCP attendu.');
}

await writeFile(join(outputDir, 'BUILD.txt'), [
  `Manifest desktop plugin ${manifest.version}`,
  `Node ${process.versions.node}`,
  'No provider credentials are bundled.',
  '',
].join('\n'));

console.log(`Plugin préparé dans ${outputDir}`);
