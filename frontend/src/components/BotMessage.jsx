import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * BotMessage — renders AI markdown responses with:
 * - Bold, italic, lists
 * - Syntax-highlighted code blocks
 * - Inline code styling
 */
const BotMessage = ({ content, time }) => {
  // Strip stored prefixes like "🤖 Study Buddy: " so we don't double-render them
  const cleaned = (content || '')
    .replace(/^🤖\s*(?:BrainHive Bot:\s*)?(?:🤖\s*)?(?:Study Buddy:\s*)?/i, '')
    .trim();

  return (
    <div style={{
      background: 'rgba(99,102,241,0.08)',
      border: '1px solid rgba(99,102,241,0.25)',
      borderRadius: 8,
      padding: '10px 14px',
      margin: '6px 0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{ color: '#818cf8', fontWeight: 700, fontSize: 13 }}>Study Buddy</span>
        {time && (
          <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 'auto' }}>{time}</span>
        )}
      </div>

      {/* Markdown content */}
      <div style={{ color: '#111827', fontSize: 14, lineHeight: 1.7 }}>
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ borderRadius: 6, fontSize: 13, margin: '8px 0', padding: '12px' }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code style={{
                  background: 'rgba(99,102,241,0.2)',
                  color: '#a5b4fc',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 13,
                  fontFamily: 'monospace',
                }} {...props}>
                  {children}
                </code>
              );
            },
            strong({ children }) {
              return <strong style={{ color: '#000000', fontWeight: 600 }}>{children}</strong>;
            },
            p({ children }) {
              return <p style={{ margin: '4px 0', color: '#111827' }}>{children}</p>;
            },
            ol({ children }) {
              return <ol style={{ paddingLeft: 20, margin: '6px 0' }}>{children}</ol>;
            },
            ul({ children }) {
              return <ul style={{ paddingLeft: 20, margin: '6px 0' }}>{children}</ul>;
            },
            li({ children }) {
              return <li style={{ margin: '3px 0', color: '#111827' }}>{children}</li>;
            },
            h1({ children }) {
              return <h1 style={{ color: '#1e3a5f', fontSize: 16, margin: '8px 0 4px' }}>{children}</h1>;
            },
            h2({ children }) {
              return <h2 style={{ color: '#1e3a5f', fontSize: 15, margin: '8px 0 4px' }}>{children}</h2>;
            },
            h3({ children }) {
              return <h3 style={{ color: '#1e3a5f', fontSize: 14, margin: '6px 0 4px' }}>{children}</h3>;
            },
            blockquote({ children }) {
              return (
                <blockquote style={{
                  borderLeft: '3px solid #6366f1',
                  paddingLeft: 12,
                  margin: '6px 0',
                  color: '#374151',
                  fontStyle: 'italic',
                }}>
                  {children}
                </blockquote>
              );
            },
          }}
        >
          {cleaned}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default BotMessage;
