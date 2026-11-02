import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageDir = join(fileURLToPath(new URL('.', import.meta.url)), 'dist/package');
const config = JSON.parse(await readFile(join(packageDir, 'mcp.json'), 'utf8'));
const server = config.mcpServers['manifest-local'];
const args = server.args.map((arg) => arg.replaceAll('${PLUGIN_ROOT}', packageDir));
const cwd = server.cwd.replaceAll('${PLUGIN_ROOT}', packageDir);
const transport = new StdioClientTransport({
  command: server.command,
  args,
  cwd,
});
const client = new Client({ name: 'manifest-desktop-package-smoke', version: '0.1.0' });

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert(tools.some((tool) => tool.name === 'open_designer'));
  const opened = await client.callTool({ name: 'open_designer', arguments: {} });
  assert.equal(opened.isError, undefined);
  assert.equal(opened.structuredContent?.storage, 'memory-m0');
  const resource = await client.readResource({ uri: 'ui://design/editor.html' });
  assert.equal(resource.contents[0]?.mimeType, 'text/html;profile=mcp-app');
  assert(resource.contents[0]?.text?.includes('Manifest'));
  console.log(JSON.stringify({
    command: server.command,
    tools: tools.map((tool) => tool.name),
    opened: opened.structuredContent,
    resourceMimeType: resource.contents[0].mimeType,
    htmlBytes: Buffer.byteLength(resource.contents[0].text ?? '', 'utf8'),
  }, null, 2));
} finally {
  await client.close();
}
