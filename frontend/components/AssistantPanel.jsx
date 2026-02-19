import React, { forwardRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const AssistantPanel = forwardRef(({
  assistantMessage,
  isLoading,
  promptValue,
  onPromptChange,
  onPromptSubmit,
}, ref) => {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onPromptSubmit();
    }
  };

  return (
    <div className="assistant-panel" ref={ref}>
      <div className="assistant-header">RefactorX - AI Assistant</div>
      <div className="assistant-content">
        <div className={`assistant-message assistant-${assistantMessage.type}`}>
          <MarkdownRenderer content={assistantMessage.content} />
        </div>
      </div>
      <div className="prompt-bar">
        <textarea
          placeholder="Ask follow-up questions..."
          disabled={isLoading}
          value={promptValue}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={handleKeyDown}
        ></textarea>
        <button disabled={isLoading || !promptValue.trim()} onClick={onPromptSubmit}>Send</button>
      </div>
    </div>
  );
});

export default AssistantPanel;
