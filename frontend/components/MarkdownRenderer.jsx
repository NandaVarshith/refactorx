import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

marked.setOptions({
  gfm: true,
  breaks: true,
});

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const MarkdownRenderer = ({ content }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const safeMarkdown = escapeHtml(content || '');
    container.innerHTML = marked.parse(safeMarkdown);

    const blocks = container.querySelectorAll('pre code');
    blocks.forEach((block) => {
      hljs.highlightElement(block);
    });
  }, [content]);

  return <div ref={containerRef} className="markdown-body" />;
};

export default MarkdownRenderer;
