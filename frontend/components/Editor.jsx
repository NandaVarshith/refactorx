import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import java from 'highlight.js/lib/languages/java';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('java', java);
hljs.registerLanguage('python', python);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);

const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const getHighlightLanguage = (language) => {
  const lower = (language || '').toLowerCase();
  if (lower === 'javascript') return 'javascript';
  if (lower === 'typescript') return 'typescript';
  if (lower === 'java') return 'java';
  if (lower === 'python') return 'python';
  if (lower === 'json') return 'json';
  if (lower === 'markdown') return 'markdown';
  if (lower === 'css') return 'css';
  if (lower === 'html') return 'xml';
  return null;
};

const getCursorFromIndex = (text, index) => {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const upToCursor = text.slice(0, safeIndex);
  const lines = upToCursor.split('\n');
  return {
    line: lines.length,
    col: lines[lines.length - 1].length + 1,
  };
};

const getIndexForLine = (text, targetLine) => {
  if (targetLine <= 1) return 0;
  const lines = text.split('\n');
  let index = 0;
  for (let i = 1; i < targetLine && i < lines.length; i += 1) {
    index += lines[i - 1].length + 1;
  }
  return index;
};

const Editor = ({ code, language, onChange, onCursorChange, focusLine, onFocusLineHandled, isLoading }) => {
  const textAreaRef = useRef(null);
  const gutterRef = useRef(null);
  const highlightRef = useRef(null);

  const lineCount = useMemo(() => Math.max(1, code.split('\n').length), [code]);
  const highlightedCode = useMemo(() => {
    const highlightLanguage = getHighlightLanguage(language);
    if (!highlightLanguage || !hljs.getLanguage(highlightLanguage)) {
      return escapeHtml(code);
    }

    try {
      return hljs.highlight(code, { language: highlightLanguage }).value;
    } catch {
      return escapeHtml(code);
    }
  }, [code, language]);

  const emitCursorPosition = useCallback(() => {
    if (!textAreaRef.current || !onCursorChange) return;
    const index = textAreaRef.current.selectionStart;
    onCursorChange(getCursorFromIndex(code, index));
  }, [code, onCursorChange]);

  useEffect(() => {
    if (!textAreaRef.current) return;
    textAreaRef.current.focus();
  }, []);

  useEffect(() => {
    if (!textAreaRef.current || focusLine == null) return;
    const nextIndex = getIndexForLine(code, focusLine);
    textAreaRef.current.focus();
    textAreaRef.current.setSelectionRange(nextIndex, nextIndex);
    emitCursorPosition();
    if (onFocusLineHandled) onFocusLineHandled();
  }, [focusLine, code, onFocusLineHandled, emitCursorPosition]);

  const handleScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.target.scrollTop;
      highlightRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  return (
    <div className="editor-area">
      <div className="editor-surface">
        <div className="editor-gutter" ref={gutterRef} aria-hidden="true">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i + 1} className="line-number">{i + 1}</div>
          ))}
        </div>
        <div className="editor-code-wrapper">
          <pre className="editor-highlight" ref={highlightRef} aria-hidden="true">
            <code dangerouslySetInnerHTML={{ __html: `${highlightedCode}\n` }} />
          </pre>
          <textarea
            ref={textAreaRef}
            className="editor-input"
            spellCheck={false}
            value={code}
            disabled={isLoading}
            onChange={(e) => onChange(e.target.value)}
            onClick={emitCursorPosition}
            onKeyUp={emitCursorPosition}
            onSelect={emitCursorPosition}
            onScroll={handleScroll}
          />
        </div>
      </div>
    </div>
  );
};

export default Editor;
