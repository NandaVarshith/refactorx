import React, { forwardRef } from 'react';

const AssistantPanel = forwardRef(({ assistantMessage, isLoading }, ref) => {
  return (
    <div className="assistant-panel" ref={ref}>
      <div className="assistant-header">RefactorX – AI Assistant</div>
      <div className="assistant-content">
        <div className={`assistant-message assistant-${assistantMessage.type}`}>
          {assistantMessage.content}
        </div>
      </div>
      <div className="prompt-bar">
        <textarea placeholder="Ask follow-up questions..." disabled={isLoading}></textarea>
        <button disabled={isLoading}>Send</button>
      </div>
    </div>
  );
});

export default AssistantPanel;