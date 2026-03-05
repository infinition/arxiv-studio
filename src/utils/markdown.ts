export function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function textToHtml(text: string) {
  return escapeHtml(text).replace(/\n/g, '<br/>');
}

export function isObsidianOpenUri(value: string) {
  return value.trim().toLowerCase().startsWith('obsidian://open?');
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[[^\]]+]\([^)]+\)/g, (_m) => _m.replace(/\[([^\]]+)]\([^)]+\)/, '$1'))
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;

  const closeLists = () => {
    if (inUl) out.push('</ul>');
    if (inOl) out.push('</ol>');
    inUl = false;
    inOl = false;
  };

  const inline = (value: string) => {
    let s = escapeHtml(value);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    return s;
  };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');

    if (/^\s*```/.test(line)) {
      closeLists();
      if (!inCode) {
        out.push('<pre><code>');
        inCode = true;
      } else {
        out.push('</code></pre>');
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      out.push(escapeHtml(raw));
      continue;
    }

    if (!line.trim()) {
      closeLists();
      out.push('<br/>');
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (heading) {
      closeLists();
      const level = Math.max(1, Math.min(6, heading[1].length));
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    closeLists();
    out.push(`<p>${inline(line)}</p>`);
  }

  closeLists();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}
