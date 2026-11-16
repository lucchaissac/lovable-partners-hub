import type * as React from 'react';
import { useState } from 'react';
import { Icon } from '@asset/ui';
import { WorkspaceExternalLink } from '../studio/WorkspaceExternalLink';

function ChatLink({ url, label }: { url: string; label?: string }) {
  const [failed, setFailed] = useState(false);
  const domain = new URL(url).hostname;
  return <WorkspaceExternalLink className="we-chat-inline-link" href={url} title={url}>{failed ? <Icon name="globe" size={14} /> : <img src={`https://icon.horse/icon/${encodeURIComponent(domain)}`} width={14} height={14} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}<span>{label || url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span></WorkspaceExternalLink>;
}

/** Inline markdown — bold (**text**) and italic (*text*). */
function ChatInline({ text, links = false }: { text: string; links?: boolean }) {
  const tokens: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    if (links) {
      const markdown = text.slice(i).match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/);
      const plain = text.slice(i).match(/^https?:\/\/[^\s<>«»]+/);
      const url = markdown?.[2] || plain?.[0].replace(/[.,;:!?)}\]”’"']+$/, '');
      if (url) {
        try { new URL(url); tokens.push(<ChatLink key={key++} url={url} label={markdown?.[1]} />); i += markdown?.[0].length || url.length; continue; } catch { /* Keep invalid input as text. */ }
      }
    }
    if (text.slice(i, i + 2) === '**') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        tokens.push(<strong key={key++}>{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        tokens.push(<em key={key++}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    let next = i + 1;
    while (next < text.length && text[next] !== '*' && (!links || (!text.startsWith('http://',next) && !text.startsWith('https://',next) && text[next] !== '['))) next++;
    tokens.push(<span key={key++}>{text.slice(i, next)}</span>);
    i = next;
  }
  return <>{tokens}</>;
}

type ChatBlock =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'ul'; items: string[] };

/** Block parser — paragraphs separated by blank lines, ordered (1. ) and
 *  unordered (- or •) lists. Asterisk is excluded from bullets so it
 *  doesn't collide with italic. */
function parseChatBlocks(text: string): ChatBlock[] {
  const blocks: ChatBlock[] = [];
  let cur: ChatBlock | null = null;
  const flush = () => {
    if (cur) {
      blocks.push(cur);
      cur = null;
    }
  };
  for (const raw of text.split('\n')) {
    if (!raw.trim()) {
      flush();
      continue;
    }
    const ol = raw.match(/^\s*(\d+)\.\s+(.*)/);
    const ul = raw.match(/^\s*[•\-]\s+(.*)/);
    if (ol) {
      if (!cur || cur.kind !== 'ol') {
        flush();
        cur = { kind: 'ol', items: [] };
      }
      cur.items.push(ol[2]);
    } else if (ul) {
      if (!cur || cur.kind !== 'ul') {
        flush();
        cur = { kind: 'ul', items: [] };
      }
      cur.items.push(ul[1]);
    } else {
      if (!cur || cur.kind !== 'p') {
        flush();
        cur = { kind: 'p', lines: [] };
      }
      cur.lines.push(raw);
    }
  }
  flush();
  return blocks;
}

export function ChatMarkdown({ text, preserveLineBreaks = false, links = false }: { text: string; preserveLineBreaks?: boolean; links?: boolean }) {
  const blocks = parseChatBlocks(text);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'p')
          return (
            <p key={i} style={preserveLineBreaks ? { whiteSpace: 'pre-wrap' } : undefined}>
              <ChatInline links={links} text={b.lines.join(preserveLineBreaks ? '\n' : ' ')} />
            </p>
          );
        if (b.kind === 'ol')
          return (
            <ol key={i}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <ChatInline links={links} text={it} />
                </li>
              ))}
            </ol>
          );
        return (
          <ul key={i}>
            {b.items.map((it, j) => (
              <li key={j}>
                <ChatInline links={links} text={it} />
              </li>
            ))}
          </ul>
        );
      })}
    </>
  );
}

