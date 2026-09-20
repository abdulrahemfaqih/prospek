'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

interface NoteViewerProps {
  content: string;
}

// Customize sanitize schema to disallow raw img and script tags
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: defaultSchema.tagNames?.filter(
    (tag) => tag !== 'script' && tag !== 'img' && tag !== 'iframe'
  ),
};

export function NoteViewer({ content }: NoteViewerProps) {
  if (!content || !content.trim()) {
    return (
      <div className="text-[13px] text-[var(--color-ink-muted)] py-2">
        Belum ada catatan.
      </div>
    );
  }

  return (
    <div className="text-[14px] text-[var(--color-ink)] leading-[1.5] break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[16px] font-semibold text-[var(--color-ink)] mt-3 mb-1.5 leading-[1.3]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[14px] font-semibold text-[var(--color-ink)] mt-3 mb-1 leading-[1.3]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14px] font-medium text-[var(--color-ink-muted)] mt-2.5 mb-1 leading-[1.3]">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[14px] font-medium text-[var(--color-ink-muted)] mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="my-1.5 leading-[1.5]">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-1.5 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-1.5 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-[1.5]">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--color-line-strong)] pl-3 my-2 text-[var(--color-ink-muted)] italic">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-[var(--color-paper)] text-[var(--color-ink)] font-mono text-[13px] px-1.5 py-0.5 rounded-[6px]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-[var(--color-paper)] p-3 rounded-[6px] overflow-x-auto my-2 font-mono text-[13px] leading-snug">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-[var(--color-line)] rounded-[6px]">
              <table className="w-full text-[13px] border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1.5 font-medium text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[var(--color-line)] px-3 py-1.5">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)]"
            >
              {children}
            </a>
          ),
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled
                  className="mr-1.5 rounded cursor-default"
                  {...props}
                />
              );
            }
            return null;
          },
          img: ({ alt, src }) => {
            const srcUrl = typeof src === 'string' ? src : '';
            return (
              <a
                href={srcUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] underline"
              >
                [Gambar: {alt || srcUrl || 'tautan'}]
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
