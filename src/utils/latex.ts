import type { Element, Page } from '../types';
import { buildDynamicBlockData } from './dynamicBlocks';

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}~^]/g, (m) => `\\${m}`);
}

function elementToLatex(el: Element, dynamic: ReturnType<typeof buildDynamicBlockData>): string {
  if (el.type === 'text') {
    const raw = el.content;
    const text = stripHtml(raw);
    if (!text.trim()) return '';

    if (raw.includes('<h1>') || (el.isBold && el.fontSize >= 24)) {
      return `\\title{${escapeLatex(text)}}\n\\maketitle`;
    }
    if (raw.includes('<h2>') || (el.isBold && el.fontSize >= 16)) {
      return `\\section*{${escapeLatex(text)}}`;
    }
    if (raw.includes('<h3>')) {
      return `\\subsection*{${escapeLatex(text)}}`;
    }

    let latex = escapeLatex(text);
    if (el.isBold) latex = `\\textbf{${latex}}`;
    if (el.isItalic) latex = `\\textit{${latex}}`;
    if (el.textAlign === 'center') latex = `\\begin{center}\n${latex}\n\\end{center}`;
    return latex;
  }

  if (el.type === 'markdownobs') {
    const lines = el.content.split(/\r?\n/);
    const out: string[] = [];
    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) {
        out.push('');
        continue;
      }
      if (line.startsWith('### ')) {
        out.push(`\\subsection*{${escapeLatex(line.slice(4).trim())}}`);
        continue;
      }
      if (line.startsWith('## ')) {
        out.push(`\\section*{${escapeLatex(line.slice(3).trim())}}`);
        continue;
      }
      if (line.startsWith('# ')) {
        out.push(`\\section*{${escapeLatex(line.slice(2).trim())}}`);
        continue;
      }
      out.push(escapeLatex(line));
    }
    return out.join('\n');
  }

  if (el.type === 'math') {
    return `\\[\n${el.content}\n\\]`;
  }

  if (el.type === 'image') {
    return `\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{figure}\n  % Note: arXiv requires the image file in the submission ZIP\n  \\caption{Figure}\n\\end{figure}`;
  }

  if (el.type === 'table' && el.tableData) {
    const cols = el.tableData[0]?.length || 1;
    const colSpec = Array(cols).fill('c').join(' | ');
    const rows = el.tableData
      .map((row) => row.map(escapeLatex).join(' & '))
      .join(' \\\\\n  \\hline\n  ');
    return `\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{| ${colSpec} |}\n  \\hline\n  ${rows} \\\\\n  \\hline\n  \\end{tabular}\n  \\caption{Table}\n\\end{table}`;
  }

  if (el.type === 'toc') {
    const rows = dynamic.toc.map((line) => escapeLatex(line)).join('\\\\\n');
    return `\\section*{${escapeLatex(el.content || 'Table of Contents')}}\n\\begin{flushleft}\n${rows}\n\\end{flushleft}`;
  }

  if (el.type === 'glossary') {
    const rows = dynamic.glossary.map((line) => escapeLatex(line)).join('\\\\\n');
    return `\\section*{${escapeLatex(el.content || 'Glossary')}}\n\\begin{flushleft}\n${rows}\n\\end{flushleft}`;
  }

  if (el.type === 'references') {
    const rows = dynamic.references.map((line) => escapeLatex(line)).join('\\\\\n');
    return `\\section*{${escapeLatex(el.content || 'References')}}\n\\begin{flushleft}\n${rows}\n\\end{flushleft}`;
  }

  return '';
}

export function generateLatex(pages: Page[], headerElements: Element[], footerElements: Element[]): string {
  const dynamic = buildDynamicBlockData(pages, headerElements, footerElements);
  const lines: string[] = [
    '\\documentclass[12pt]{article}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage{amsmath,amssymb}',
    '\\usepackage{graphicx}',
    '\\usepackage{geometry}',
    '\\geometry{a4paper, margin=1in}',
    '',
    '\\begin{document}',
    '',
  ];

  // Header elements as preamble
  for (const el of headerElements) {
    const latex = elementToLatex(el, dynamic);
    if (latex) lines.push(latex, '');
  }

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) lines.push('\\newpage', '');
    const sorted = [...pages[i].elements].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const el of sorted) {
      const latex = elementToLatex(el, dynamic);
      if (latex) lines.push(latex, '');
    }
  }

  // Footer
  for (const el of footerElements) {
    const latex = elementToLatex(el, dynamic);
    if (latex) lines.push(latex, '');
  }

  lines.push('\\end{document}');
  return lines.join('\n');
}
