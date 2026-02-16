import React, { useEffect, useMemo, useRef } from 'react';

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

const Editor = ({ code, onChange, onCursorChange, focusLine, onFocusLineHandled, isLoading }) => {
  const textAreaRef = useRef(null);
  const gutterRef = useRef(null);

  const lineCount = useMemo(() => Math.max(1, code.split('\n').length), [code]);

  const emitCursorPosition = () => {
    if (!textAreaRef.current || !onCursorChange) return;
    const index = textAreaRef.current.selectionStart;
    onCursorChange(getCursorFromIndex(code, index));
  };

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
  }, [focusLine, code, onFocusLineHandled]);

  const handleScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
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
  );
};

export default Editor;
