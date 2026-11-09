import React from 'react';

interface AIMarkdownRendererProps {
  content: string;
}

/**
 * Lightweight, safe, dependency-free Markdown to JSX renderer.
 * Supports headings, bold, italic, inline code, code blocks, tables, blockquotes, and lists.
 */
export const AIMarkdownRenderer: React.FC<AIMarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split content into blocks: code blocks, tables, paragraphs, lists, etc.
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-slate-800 break-words font-sans">
      {blocks.map((block, idx) => renderBlock(block, idx))}
    </div>
  );
};

interface Block {
  type: 'paragraph' | 'header' | 'code' | 'table' | 'list' | 'quote';
  level?: number;
  lines?: string[];
  lang?: string;
  code?: string;
  headers?: string[];
  rows?: string[][];
  ordered?: boolean;
  items?: string[];
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Fenced Code Block: ```lang
    if (line.trim().startsWith('```')) {
      const lang = line.trim().replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'code',
        lang: lang || 'text',
        code: codeLines.join('\n'),
      });
      i++;
      continue;
    }

    // 2. Headings: #, ##, ###, ####
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      blocks.push({
        type: 'header',
        level: headerMatch[1].length,
        lines: [headerMatch[2]],
      });
      i++;
      continue;
    }

    // 3. Blockquote: >
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'quote',
        lines: quoteLines,
      });
      continue;
    }

    // 4. Markdown Table: starts with | and next line has |---
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().includes('|-')
    ) {
      const headers = line
        .split('|')
        .slice(1, -1)
        .map((h) => h.trim());
      i += 2; // skip header line and separator line
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        rows.push(row);
        i++;
      }
      blocks.push({
        type: 'table',
        headers,
        rows,
      });
      continue;
    }

    // 5. Unordered List: * or -
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'list',
        ordered: false,
        items,
      });
      continue;
    }

    // 6. Ordered List: 1. , 2. 
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'list',
        ordered: true,
        items,
      });
      continue;
    }

    // 7. Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // 8. Normal Paragraph (gather adjacent non-empty, non-special lines)
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].match(/^#{1,4}\s+/) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !(lines[i].trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().includes('|-'))
    ) {
      pLines.push(lines[i]);
      i++;
    }

    if (pLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        lines: pLines,
      });
    }
  }

  return blocks;
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case 'header': {
      const text = block.lines?.[0] || '';
      if (block.level === 1) {
        return (
          <h1 key={key} className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-1 mt-3">
            {renderInline(text)}
          </h1>
        );
      }
      if (block.level === 2) {
        return (
          <h2 key={key} className="text-sm sm:text-base font-bold text-slate-900 mt-2.5">
            {renderInline(text)}
          </h2>
        );
      }
      if (block.level === 3) {
        return (
          <h3 key={key} className="text-xs sm:text-sm font-semibold text-slate-800 mt-2">
            {renderInline(text)}
          </h3>
        );
      }
      return (
        <h4 key={key} className="text-xs font-semibold text-slate-700 mt-1.5">
          {renderInline(text)}
        </h4>
      );
    }

    case 'code':
      return (
        <div key={key} className="my-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 text-slate-100 text-xs shadow-xs">
          {block.lang && (
            <div className="bg-slate-800 px-3 py-1 text-[10px] uppercase font-mono text-slate-400 border-b border-slate-700/50 flex justify-between items-center">
              <span>{block.lang}</span>
            </div>
          )}
          <pre className="p-3 overflow-x-auto font-mono text-[11px] sm:text-xs leading-relaxed">
            <code>{block.code}</code>
          </pre>
        </div>
      );

    case 'quote':
      return (
        <blockquote key={key} className="border-l-3 border-teal-500 pl-3 py-1 my-1.5 bg-teal-50/50 rounded-r-lg text-slate-700 italic">
          {block.lines?.map((line, i) => (
            <p key={i}>{renderInline(line)}</p>
          ))}
        </blockquote>
      );

    case 'table':
      return (
        <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                {block.headers?.map((h, i) => (
                  <th key={i} className="px-3 py-2 border-r border-slate-200 last:border-r-0">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {block.rows?.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 border-r border-slate-200 last:border-r-0 text-slate-700">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'list': {
      const items = block.items || [];
      if (block.ordered) {
        return (
          <ol key={key} className="list-decimal list-outside pl-4 space-y-1 my-1.5 text-slate-700">
            {items.map((item, idx) => (
              <li key={idx} className="pl-1 leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul key={key} className="list-disc list-outside pl-4 space-y-1 my-1.5 text-slate-700">
          {items.map((item, idx) => (
            <li key={idx} className="pl-1 leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    }

    case 'paragraph':
    default:
      return (
        <p key={key} className="leading-relaxed">
          {block.lines?.map((line, lIdx) => (
            <React.Fragment key={lIdx}>
              {lIdx > 0 && <br />}
              {renderInline(line)}
            </React.Fragment>
          ))}
        </p>
      );
  }
}

/**
 * Parses inline formatting:
 * **bold**, *italic*, `code`, and [links](url)
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split tokens for bold, italic, code, links
  // Pattern regex
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Regex for inline code: `code`
  // Regex for bold: **text** or __text__
  // Regex for italic: *text* or _text_
  // Regex for link: [text](url)
  const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+(?!\*)|\[[^\]]+\]\([^)]+\))/;

  while (remaining) {
    const match = remaining.match(inlineRegex);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    // Text before match
    if (match.index > 0) {
      parts.push(remaining.substring(0, match.index));
    }

    const token = match[0];

    if (token.startsWith('`') && token.endsWith('`')) {
      // Inline Code
      const code = token.slice(1, -1);
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 text-teal-800 font-mono text-[11px] sm:text-xs border border-slate-200"
        >
          {code}
        </code>
      );
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      // Bold
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={key++} className="font-bold text-slate-900">
          {renderInline(boldText)}
        </strong>
      );
    } else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      // Italic
      const italicText = token.slice(1, -1);
      parts.push(
        <em key={key++} className="italic text-slate-700">
          {renderInline(italicText)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      // Link
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        parts.push(
          <a
            key={key++}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:text-teal-700 underline font-medium"
          >
            {linkText}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }

    remaining = remaining.substring(match.index + token.length);
  }

  return parts;
}

export default AIMarkdownRenderer;
