"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

function normalizeLang(lang: string | undefined): string {
  if (!lang) return "plaintext";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rb: "ruby",
    sh: "bash",
    shell: "bash",
    yml: "yaml",
    yaml: "yaml",
    md: "markdown",
    html: "markup",
    vue: "markup",
    xml: "markup",
    bash: "bash",
    zsh: "bash"
  };
  return map[lang] ?? lang;
}

interface MessageMarkdownProps {
  content: string;
}

function sanitizeUrl(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return "#";

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:") ||
    lower.startsWith("data:")
  ) {
    return "#";
  }

  return trimmed;
}

export function MessageMarkdown({ content }: MessageMarkdownProps) {
  return (
    <div
      className={
        "prose prose-sm max-w-none text-ink " +
        "prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-ink " +
        "prose-h1:text-lg prose-h2:text-base prose-h3:text-sm " +
        "prose-p:my-2 prose-p:leading-relaxed " +
        "prose-strong:text-ink prose-a:text-ink prose-a:underline prose-a:decoration-2 prose-a:underline-offset-2 hover:prose-a:bg-lime " +
        "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 " +
        "prose-blockquote:border-l-ink prose-blockquote:border-l-4 prose-blockquote:text-ink/80 " +
        "prose-hr:border-ink"
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) => sanitizeUrl(url)}
        components={{
          pre({ children }) {
            return <div className="not-prose my-3 overflow-x-auto first:mt-0">{children}</div>;
          },
          a({ href, children, ...props }) {
            const safeHref = sanitizeUrl(href || "");
            const isExternal = /^https?:\/\//i.test(safeHref);
            return (
              <a
                href={safeHref}
                rel={isExternal ? "noopener noreferrer nofollow" : undefined}
                target={isExternal ? "_blank" : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = Boolean(match);

            if (!isBlock) {
              return (
                <code
                  className="not-prose border border-ink bg-panelAlt px-1.5 py-0.5 font-mono text-[0.85em] text-ink"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const lang = normalizeLang(match?.[1]);
            return (
              <SyntaxHighlighter
                language={lang}
                style={oneLight}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: "0.875rem 1rem",
                  borderRadius: 0,
                  border: "2px solid #000000",
                  fontSize: "0.8125rem",
                  lineHeight: 1.5
                }}
                wrapLongLines
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
