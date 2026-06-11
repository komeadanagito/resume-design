import { Fragment, type ReactNode } from 'react';

export function renderMarkdown(input: string): ReactNode {
  const blocks = parseBlocks(input);
  return (
    <>
      {blocks.map((b, i) => renderBlock(b, i))}
    </>
  );
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: 1 | 2 | 3 | 4; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'code'; lang: string | null; body: string }
  | { kind: 'hr' };

function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }
    // Fenced code block.
    const fence = /^```(\w[\w+-]*)?\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] ?? null;
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i] ?? '')) {
        buf.push(lines[i] ?? '');
        i++;
      }
      // Skip the closing fence (if present).
      if (i < lines.length) i++;
      out.push({ kind: 'code', lang, body: buf.join('\n') });
      continue;
    }
    // ATX heading.
    const heading = /^(#{1,4})\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      const level = heading[1]!.length as 1 | 2 | 3 | 4;
      out.push({ kind: 'h', level, text: heading[2]! });
      i++;
      continue;
    }
    // Horizontal rule.
    if (/^\s*(-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
      out.push({ kind: 'hr' });
      i++;
      continue;
    }
    // Unordered list. Group consecutive items.
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      out.push({ kind: 'ul', items });
      continue;
    }
    // Ordered list.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push({ kind: 'ol', items });
      continue;
    }
    // Paragraph: greedy until a blank line or another block-starter.
    const buf: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i] ?? '';
      if (next.trim() === '') break;
      if (/^```/.test(next)) break;
      if (/^#{1,4}\s+/.test(next)) break;
      if (/^\s*[-*+]\s+/.test(next)) break;
      if (/^\s*\d+\.\s+/.test(next)) break;
      buf.push(next);
      i++;
    }
    out.push({ kind: 'p', text: buf.join('\n') });
  }
  return out;
}

function renderBlock(block: Block, key: number): ReactNode {
  if (block.kind === 'p') {
    return <p key={key} className="mb-4 text-ink-700 leading-relaxed text-sm md-p">{renderInline(block.text)}</p>;
  }
  if (block.kind === 'h') {
    const Tag = (`h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4');
    const classes = 
      block.level === 1 ? 'text-xl font-bold text-ink-900 mt-6 mb-3' :
      block.level === 2 ? 'text-lg font-bold text-ink-900 mt-5 mb-2' :
      block.level === 3 ? 'text-base font-semibold text-ink-900 mt-4 mb-2' :
      'text-sm font-semibold text-ink-700 mt-3 mb-1';
    return <Tag key={key} className={`${classes} md-h`}>{renderInline(block.text)}</Tag>;
  }
  if (block.kind === 'ul') {
    return (
      <ul key={key} className="list-disc list-inside mb-4 pl-4 space-y-1 text-ink-700 text-sm md-ul">
        {block.items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }
  if (block.kind === 'ol') {
    return (
      <ol key={key} className="list-decimal list-inside mb-4 pl-4 space-y-1 text-ink-700 text-sm md-ol">
        {block.items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ol>
    );
  }
  if (block.kind === 'code') {
    return (
      <pre key={key} className="bg-surface-muted rounded-xl p-4 overflow-x-auto my-4 text-xs font-mono border border-ink-300/30 text-ink-900 md-code">
        <code data-lang={block.lang ?? undefined}>{block.body}</code>
      </pre>
    );
  }
  if (block.kind === 'hr') {
    return <hr key={key} className="my-6 border-t border-ink-300/20 md-hr" />;
  }
  return null;
}

function renderInline(text: string): ReactNode {
  const out: ReactNode[] = [];
  const re =
    /(`[^`]+`)|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s)<>]+)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) {
      pushText(out, text.slice(lastIndex, m.index), key++);
    }
    if (m[1]) {
      out.push(
        <code key={key++} className="bg-surface-muted border border-ink-300/30 text-ink-900 rounded px-1.5 py-0.5 text-xs font-mono">
          {m[1].slice(1, -1)}
        </code>,
      );
    } else if (m[2] && m[3]) {
      out.push(
        <a
          key={key++}
          className="text-brand-500 hover:text-brand-600 underline"
          href={m[3]}
          target="_blank"
          rel="noreferrer noopener"
        >
          {m[2]}
        </a>,
      );
    } else if (m[4]) {
      out.push(
        <a
          key={key++}
          className="text-brand-500 hover:text-brand-600 underline break-all"
          href={m[4]}
          target="_blank"
          rel="noreferrer noopener"
        >
          {m[4]}
        </a>,
      );
    } else if (m[5]) {
      out.push(<strong key={key++} className="font-bold text-ink-900">{m[5].slice(2, -2)}</strong>);
    } else if (m[6]) {
      out.push(<strong key={key++} className="font-bold text-ink-900">{m[6].slice(2, -2)}</strong>);
    } else if (m[7]) {
      out.push(<em key={key++} className="italic text-ink-700">{m[7].slice(1, -1)}</em>);
    } else if (m[8]) {
      out.push(<em key={key++} className="italic text-ink-700">{m[8].slice(1, -1)}</em>);
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    pushText(out, text.slice(lastIndex), key++);
  }
  return <Fragment>{out}</Fragment>;
}

function pushText(out: ReactNode[], text: string, baseKey: number): void {
  if (!text) return;
  const urlRe = /(https?:\/\/[^\s)]+)/g;
  const segments: ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = urlRe.exec(text))) {
    if (m.index > lastIndex) {
      segments.push(...withBreaks(text.slice(lastIndex, m.index), `${baseKey}-${k++}`));
    }
    segments.push(
      <a
        key={`${baseKey}-${k++}`}
        className="text-brand-500 hover:text-brand-600 underline break-all"
        href={m[1]}
        target="_blank"
        rel="noreferrer noopener"
      >
        {m[1]}
      </a>,
    );
    lastIndex = urlRe.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push(...withBreaks(text.slice(lastIndex), `${baseKey}-${k++}`));
  }
  out.push(<Fragment key={baseKey}>{segments}</Fragment>);
}

function withBreaks(text: string, baseKey: string): ReactNode[] {
  const parts = text.split('\n');
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i > 0) out.push(<br key={`${baseKey}-br-${i}`} />);
    if (part) out.push(<Fragment key={`${baseKey}-t-${i}`}>{part}</Fragment>);
  });
  return out;
}
