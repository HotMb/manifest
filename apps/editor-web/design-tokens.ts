import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const designFile = fileURLToPath(new URL('../../DESIGN.md', import.meta.url));

// The current project contract deliberately uses quoted scalar values.
// Refuse unsupported syntax instead of silently drifting from DESIGN.md.
function quotedValue(frontmatter: string, section: string, key: string, nested?: string): string {
  const sectionPattern = new RegExp(`^${section}:\\r?\\n((?:[ \\t].*\\r?\\n|\\r?\\n)*)`, 'm');
  const contents = frontmatter.match(sectionPattern)?.[1];
  if (!contents) throw new Error(`DESIGN.md : section ${section} absente.`);
  const pattern = nested
    ? new RegExp(`^  ${key}:\\r?\\n    ${nested}: "([^"\\n]+)"`, 'm')
    : new RegExp(`^  ${key}: "([^"\\n]+)"`, 'm');
  const value = contents.match(pattern)?.[1];
  if (!value || /[{};]/.test(value)) throw new Error(`DESIGN.md : token ${section}.${key} non pris en charge.`);
  return value;
}

export function editorTokensCss(document: string): string {
  const frontmatter = document.match(/^---\r?\n([\s\S]*?)\r?\n---/m)?.[1];
  if (!frontmatter) throw new Error('DESIGN.md : frontmatter absent.');
  const entries: [string, string][] = [];
  for (const key of ['background', 'surface', 'primary', 'foreground', 'secondary', 'border']) {
    entries.push([`--editor-${key}`, quotedValue(frontmatter + '\n', 'colors', key)]);
  }
  entries.push(['--editor-font', quotedValue(frontmatter + '\n', 'typography', 'sans', 'fontFamily')]);
  entries.push(['--editor-mono', quotedValue(frontmatter + '\n', 'typography', 'mono', 'fontFamily')]);
  for (const key of ['control', 'panel']) entries.push([`--radius-${key}`, quotedValue(frontmatter + '\n', 'rounded', key)]);
  for (const key of ['unit', 'controlGap', 'panelPadding']) entries.push([`--space-${key}`, quotedValue(frontmatter + '\n', 'spacing', key)]);
  return `/* Generated from DESIGN.md at build time. */\n:root{${entries.map(([key, value]) => `${key}:${value}`).join(';')}}`;
}

export function designTokensPlugin(): Plugin {
  const id = 'virtual:editor-tokens.css';
  return {
    name: 'design-workbench-tokens',
    resolveId(source) { return source === id ? `\0${id}` : undefined; },
    load(source) {
      if (source !== `\0${id}`) return undefined;
      this.addWatchFile(designFile);
      return editorTokensCss(readFileSync(designFile, 'utf8'));
    },
  };
}
