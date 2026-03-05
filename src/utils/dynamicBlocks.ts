import type { Element, Page } from '../types';

export interface DynamicBlockData {
  toc: string[];
  glossary: string[];
  references: string[];
}

interface HeadingItem {
  level: 1 | 2 | 3;
  text: string;
  page: number;
}

export function buildDynamicBlockData(
  pages: Page[],
  headerElements: Element[] = [],
  footerElements: Element[] = []
): DynamicBlockData {
  const headings = extractHeadings(pages, headerElements, footerElements);
  const glossary = extractGlossary(pages, headerElements, footerElements);
  const references = extractReferences(pages, headerElements, footerElements);

  return {
    toc: headings.length
      ? headings.map((h) => `${'  '.repeat(Math.max(0, h.level - 1))}${h.text} ...... ${h.page}`)
      : ['No headings found. Add H1/H2/H3 in text blocks.'],
    glossary: glossary.length
      ? glossary.map((g) => `${g.term}: ${g.definition}`)
      : ['No glossary terms found. Use "Term:: Definition" in text blocks.'],
    references: references.length
      ? references.map((r) => `[${r.index}] ${r.value}`)
      : ['No references found. Use lines like "[1] Your reference".'],
  };
}

function extractHeadings(pages: Page[], headerElements: Element[], footerElements: Element[]): HeadingItem[] {
  const all: HeadingItem[] = [];
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx += 1) {
    const inPage = collectTextElements(pages[pageIdx].elements);
    const inHeader = pageIdx === 0 ? collectTextElements(headerElements) : [];
    const inFooter = pageIdx === pages.length - 1 ? collectTextElements(footerElements) : [];
    const combined = [...inHeader, ...inPage, ...inFooter];
    for (const el of combined) {
      const html = el.content || '';
      const found = extractHeadingsFromHtml(html);
      for (const h of found) {
        all.push({ level: h.level, text: h.text, page: pageIdx + 1 });
      }
    }
  }
  return all;
}

function extractGlossary(pages: Page[], headerElements: Element[], footerElements: Element[]) {
  const chunks = [
    ...pages.flatMap((p) => collectTextElements(p.elements).map((el) => stripHtml(el.content))),
    ...collectTextElements(headerElements).map((el) => stripHtml(el.content)),
    ...collectTextElements(footerElements).map((el) => stripHtml(el.content)),
  ];
  const map = new Map<string, { term: string; definition: string }>();
  for (const block of chunks) {
    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z][A-Za-z0-9 \-_]{1,80})\s*::\s*(.+)\s*$/);
      if (!match) continue;
      const term = match[1].trim();
      const definition = match[2].trim();
      const key = term.toLowerCase();
      if (!map.has(key)) map.set(key, { term, definition });
    }
  }
  return [...map.values()].sort((a, b) => a.term.localeCompare(b.term));
}

function extractReferences(pages: Page[], headerElements: Element[], footerElements: Element[]) {
  const chunks = [
    ...pages.flatMap((p) => collectTextElements(p.elements).map((el) => stripHtml(el.content))),
    ...collectTextElements(headerElements).map((el) => stripHtml(el.content)),
    ...collectTextElements(footerElements).map((el) => stripHtml(el.content)),
  ];
  const refs = new Map<number, string>();
  for (const block of chunks) {
    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*\[(\d+)\]\s+(.+)\s*$/);
      if (!match) continue;
      const idx = Number(match[1]);
      const value = match[2].trim();
      if (Number.isFinite(idx) && !refs.has(idx)) refs.set(idx, value);
    }
  }
  return [...refs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, value]) => ({ index, value }));
}

function collectTextElements(elements: Element[]) {
  return [...elements]
    .filter((el) => el.type === 'text' || el.type === 'markdownobs')
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function extractHeadingsFromHtml(html: string): Array<{ level: 1 | 2 | 3; text: string }> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const direct = wrapper.querySelectorAll('h1, h2, h3');
  const out: Array<{ level: 1 | 2 | 3; text: string }> = [];
  for (const node of Array.from(direct)) {
    const txt = (node.textContent || '').trim();
    if (!txt) continue;
    const level = Number(node.tagName[1]) as 1 | 2 | 3;
    if (level >= 1 && level <= 3) out.push({ level, text: txt });
  }
  if (out.length > 0) return out;

  const plain = stripHtml(html);
  return plain
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('### ')) return { level: 3 as const, text: line.slice(4).trim() };
      if (line.startsWith('## ')) return { level: 2 as const, text: line.slice(3).trim() };
      if (line.startsWith('# ')) return { level: 1 as const, text: line.slice(2).trim() };
      return null;
    })
    .filter((v): v is { level: 1 | 2 | 3; text: string } => v !== null && v.text.length > 0);
}

function stripHtml(html: string): string {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return (wrapper.textContent || wrapper.innerText || '').trim();
}
