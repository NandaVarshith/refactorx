import React, { useState, useEffect, useRef } from 'react';
import './App.css'
import AssistantPanel from '../components/AssistantPanel';
import ActionButtons from '../components/ActionButtons';
import Editor from '../components/Editor';
import ReviewDock from '../components/ReviewDock';

// --- Constants ---
const API_BASE_URL = 'http://127.0.0.1:8000';
const INITIAL_FILES = [
  {
    id: 'index-jsx',
    name: 'index.jsx',
    language: 'JavaScript',
    initialCode: `import React from 'react';\n\nexport default function App() {\n  return <h1>Hello RefactorX</h1>;\n}`,
  },
  {
    id: 'sol-java',
    name: 'sol.java',
    language: 'Java',
    initialCode: `class Solution {\n  public int almostPalindromic(String s) {\n    int n = s.length();\n    if (n <= 1) return n;\n    return n;\n  }\n}`,
  },
];

const inferLanguage = (fileName) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.java')) return 'Java';
  if (lower.endsWith('.jsx') || lower.endsWith('.js')) return 'JavaScript';
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'TypeScript';
  if (lower.endsWith('.py')) return 'Python';
  if (lower.endsWith('.json')) return 'JSON';
  if (lower.endsWith('.md')) return 'Markdown';
  if (lower.endsWith('.css')) return 'CSS';
  if (lower.endsWith('.html')) return 'HTML';
  return 'Text';
};

function LandingPage({ onStart }) {
  return (
    <div className="landing-shell" onClick={onStart}>
      <div className="landing-bg-orb landing-bg-orb-one" aria-hidden="true" />
      <div className="landing-bg-orb landing-bg-orb-two" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-brand">RefactorX</div>
        <button type="button" className="landing-link-btn" onClick={onStart}>
          Open Workspace
        </button>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <p className="landing-kicker">AI Code Review + Refactor Assistant</p>
          <h1>Ship cleaner code in minutes, not hours.</h1>
          <p className="landing-subtitle">
            Review, optimize, explain, and fix code issues with one workspace built for practical engineering work.
          </p>

          <div className="landing-actions">
            <button type="button" className="landing-primary-btn" onClick={onStart}>
              Start Workspace
            </button>
            <button type="button" className="landing-secondary-btn" onClick={onStart}>
              Try Demo Flow
            </button>
          </div>
        </section>

        <section className="landing-grid" aria-label="Key features">
          <article className="landing-card">
            <h3>Structured Reviews</h3>
            <p>Get actionable issue cards with severity, line targeting, and quick fix hints.</p>
          </article>
          <article className="landing-card">
            <h3>One-Click Fixes</h3>
            <p>Resolve detected issues and immediately validate with follow-up analysis.</p>
          </article>
          <article className="landing-card">
            <h3>Prompt-Driven Editing</h3>
            <p>Ask focused questions and iterate with contextual memory inside your session.</p>
          </article>
        </section>
      </main>
    </div>
  );
}

function WorkspaceApp({ onBackToLanding }) {
  // --- State Management ---
  const [files, setFiles] = useState(INITIAL_FILES);
  const [fileContents, setFileContents] = useState(() => {
    const initialState = {};
    INITIAL_FILES.forEach((file) => {
      initialState[file.id] = file.initialCode;
    });
    return initialState;
  });
  const [activeFileId, setActiveFileId] = useState(INITIAL_FILES[1].id);
  const [assistantMessage, setAssistantMessage] = useState({
    content: 'Welcome. Run a review to analyze your code.',
    type: 'message' // 'message', 'error', 'loading'
  });
  const [reviewData, setReviewData] = useState(null); // { score, issues, summary }
  const [isLoading, setIsLoading] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 }); // For status bar
  const [focusLine, setFocusLine] = useState(null);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fixingIssueId, setFixingIssueId] = useState(null);
  const [promptInput, setPromptInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const activeFile = files.find((file) => file.id === activeFileId) || files[0];
  const code = fileContents[activeFile.id] ?? '';

  // --- Refs for DOM elements we need to interact with directly ---
  const leftPanelRef = useRef(null);
  const splitterRef = useRef(null);
  const newFileInputRef = useRef(null);

  // --- Panel Resizing Logic ---
  useEffect(() => {
    const splitter = splitterRef.current;
    const leftPanel = leftPanelRef.current;
    if (!splitter || !leftPanel) return;

    let isDragging = false;

    const onMouseDown = (e) => {
      e.preventDefault();
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    const onMouseMove = (e) => {
      if (isDragging) {
        const newLeftWidth = e.clientX;
        // Add constraints to prevent panels from becoming too small
        if (newLeftWidth > 260 && newLeftWidth < (window.innerWidth - 400)) {
          leftPanel.style.width = newLeftWidth + 'px';
        }
      }
    };

    splitter.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      splitter.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []); // Empty dependency array means this effect runs only once on mount

  useEffect(() => {
    if (isAddingFile && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [isAddingFile]);

  const extractTextFromPayload = (payload) => {
    if (typeof payload === 'string') return payload;
    if (!payload || typeof payload !== 'object') return '';
    return (
      payload.review ||
      payload.explanation ||
      payload.message ||
      payload.result ||
      payload.output ||
      ''
    );
  };

  const extractCodeFromMarkdownFence = (text) => {
    if (!text) return '';
    const fencedMatch = text.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
    return fencedMatch ? fencedMatch[1].trimEnd() : text;
  };

  const extractCodeFromPayload = (payload) => {
    if (typeof payload === 'string') return payload;
    if (!payload || typeof payload !== 'object') return '';
    const rawCode =
      payload.rewritten_code ||
      payload.optimized_code ||
      payload.code ||
      payload.rewrite ||
      payload.optimized ||
      payload.result ||
      payload.output ||
      '';
    return extractCodeFromMarkdownFence(rawCode);
  };

  const normalizeStructuredReview = (payload) => {
    if (!payload || typeof payload !== 'object') {
      return { score: 10, summary: 'No actionable issues found.', issues: [] };
    }

    const rawIssues = Array.isArray(payload.issues) ? payload.issues : [];
    const normalizedIssues = rawIssues
      .map((issue, index) => {
        if (!issue || typeof issue !== 'object') return null;
        const line = Number.parseInt(issue.line, 10);
        const severityRaw = String(issue.severity || '').toLowerCase();
        const severity =
          severityRaw === 'high' || severityRaw === 'critical'
            ? 'high'
            : severityRaw === 'medium'
              ? 'medium'
              : 'suggestion';
        const message = String(issue.message || '').trim();
        if (!message) return null;

        return {
          id: String(issue.id || `issue-${index + 1}-${Number.isFinite(line) ? line : 1}`),
          severity,
          line: Number.isFinite(line) && line > 0 ? line : 1,
          message,
          fix: String(issue.fix || '').trim() || 'Apply a minimal targeted fix.',
        };
      })
      .filter(Boolean);

    const scoreValue = Number.parseInt(payload.score, 10);
    const score = Number.isFinite(scoreValue) ? Math.max(1, Math.min(scoreValue, 10)) : Math.max(1, 10 - normalizedIssues.length);
    const summary = String(payload.summary || '').trim() || (normalizedIssues.length ? `${normalizedIssues.length} actionable issue(s) found.` : 'No actionable issues found.');

    return { score, summary, issues: normalizedIssues };
  };

  const normalizeIssueMessage = (message) =>
    String(message || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const isSameIssue = (targetIssue, candidateIssue) => {
    if (!targetIssue || !candidateIssue) return false;
    const sameLine = Math.abs(Number(candidateIssue.line) - Number(targetIssue.line)) <= 1;
    if (!sameLine) return false;

    const targetMessage = normalizeIssueMessage(targetIssue.message);
    const candidateMessage = normalizeIssueMessage(candidateIssue.message);
    if (!targetMessage || !candidateMessage) return false;

    return (
      candidateMessage.includes(targetMessage) ||
      targetMessage.includes(candidateMessage)
    );
  };

  const appendChatHistory = (role, content) => {
    const normalizedRole = String(role || '').trim().toLowerCase();
    const normalizedContent = String(content || '').trim();
    if (!normalizedContent) return;
    if (normalizedRole !== 'user' && normalizedRole !== 'assistant') return;

    setChatHistory((prev) => [...prev, { role: normalizedRole, content: normalizedContent }].slice(-20));
  };

  const apiPost = async (endpoint, payload) => {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error?.message || `HTTP error! Status: ${response.status}`);
    }

    return response.json();
  };

  // --- API Call Logic ---
  const performApiAction = async (actionName) => {
    if (isLoading) return;

    setIsLoading(true);
    setAssistantMessage({ content: 'Analyzing...', type: 'loading' });
    appendChatHistory('user', `${actionName} the current ${activeFile.language} code.`);

    try {
      if (actionName === 'review') {
        const [reviewTextData, structuredReviewData] = await Promise.all([
          apiPost('review', { code, language: activeFile.language }),
          apiPost('review-structured', { code, language: activeFile.language }),
        ]);

        const reviewText = extractTextFromPayload(reviewTextData) || 'Review complete.';
        const normalizedReview = normalizeStructuredReview(structuredReviewData);
        setReviewData(normalizedReview);
        setAssistantMessage({ content: reviewText, type: 'message' });
        appendChatHistory('assistant', reviewText);
      } else if (actionName === 'rewrite' || actionName === 'optimize') {
        const data = await apiPost(actionName, { code, language: activeFile.language });
        const nextCode = extractCodeFromPayload(data);
        if (nextCode) {
          setFileContents((prev) => ({ ...prev, [activeFile.id]: nextCode }));
          setReviewData(null);
          const resultMessage = `Code ${actionName} complete.`;
          setAssistantMessage({ content: resultMessage, type: 'message' });
          appendChatHistory('assistant', resultMessage);
        } else {
          const resultMessage = extractTextFromPayload(data) || `${actionName} complete.`;
          setAssistantMessage({ content: resultMessage, type: 'message' });
          appendChatHistory('assistant', resultMessage);
        }
      } else if (actionName === 'explain') {
        const data = await apiPost(actionName, { code, language: activeFile.language });
        const resultMessage = extractTextFromPayload(data) || 'Explanation complete.';
        setAssistantMessage({ content: resultMessage, type: 'message' });
        appendChatHistory('assistant', resultMessage);
      } else {
        const data = await apiPost(actionName, { code, language: activeFile.language });
        const resultMessage = extractTextFromPayload(data) || 'Request complete.';
        setAssistantMessage({ content: resultMessage, type: 'message' });
        appendChatHistory('assistant', resultMessage);
      }
    } catch (error) {
      console.error(`API Error on /${actionName}:`, error);
      setAssistantMessage({ content: `Error: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Event Handlers ---
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 1500);
    }).catch(err => console.error('Failed to copy code: ', err));
  };

  const handleEditorChange = (nextCode) => {
    setFileContents((prev) => ({ ...prev, [activeFile.id]: nextCode }));
    setReviewData(null);
  };

  const handleCardClick = (lineNumber) => {
    setFocusLine(lineNumber);
    setCursorPos({ line: lineNumber, col: 1 });
  };

  const handlePromptSubmit = async () => {
    if (isLoading) return;

    const userPrompt = promptInput.trim();
    if (!userPrompt) return;

    const nextHistory = [...chatHistory, { role: 'user', content: userPrompt }].slice(-20);
    setPromptInput('');
    setChatHistory(nextHistory);
    setIsLoading(true);
    setAssistantMessage({ content: 'Thinking...', type: 'loading' });

    try {
      const data = await apiPost('promptbar', {
        code,
        language: activeFile.language,
        prompt: userPrompt,
        history: nextHistory,
      });
      const reply = extractTextFromPayload(data) || 'Request complete.';
      setAssistantMessage({ content: reply, type: 'message' });
      appendChatHistory('assistant', reply);
    } catch (error) {
      console.error('API Error on /promptbar:', error);
      setAssistantMessage({ content: `Error: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveIssue = async (issue) => {
    if (isLoading) return;

    setIsLoading(true);
    setFixingIssueId(issue.id);
    setAssistantMessage({ content: `Fixing issue on line ${issue.line}...`, type: 'loading' });

    try {
      const fixResult = await apiPost('fix-issue', {
        code,
        language: activeFile.language,
        issue,
      });
      const fixedCode = extractCodeFromPayload({ code: fixResult.fixed_code });
      if (!fixedCode) {
        throw new Error('Fix API returned empty code.');
      }

      setFileContents((prev) => ({ ...prev, [activeFile.id]: fixedCode }));
      const updatedStructuredReview = await apiPost('review-structured', {
        code: fixedCode,
        language: activeFile.language,
      });
      const normalizedReview = normalizeStructuredReview(updatedStructuredReview);
      const targetIssueStillPresent = normalizedReview.issues.some((nextIssue) =>
        isSameIssue(issue, nextIssue)
      );
      if (targetIssueStillPresent) {
        throw new Error('Selected issue is still present after fix. Try fixing it again.');
      }

      setReviewData(normalizedReview);
      setAssistantMessage({
        content: fixResult.change_summary || `Issue on line ${issue.line} fixed.`,
        type: 'message',
      });
      setFocusLine(issue.line);
      setCursorPos({ line: issue.line, col: 1 });
    } catch (error) {
      console.error('API Error on /fix-issue:', error);
      setAssistantMessage({ content: `Error: ${error.message}`, type: 'error' });
    } finally {
      setFixingIssueId(null);
      setIsLoading(false);
    }
  };

  const createNewFile = (fileName) => {
    const normalizedName = fileName.trim();
    if (!normalizedName) return;

    const alreadyExists = files.some((file) => file.name.toLowerCase() === normalizedName.toLowerCase());
    if (alreadyExists) {
      setAssistantMessage({ content: `File "${normalizedName}" already exists.`, type: 'error' });
      return;
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newFile = {
      id: fileId,
      name: normalizedName,
      language: inferLanguage(normalizedName),
      initialCode: '',
    };

    setFiles((prev) => [...prev, newFile]);
    setFileContents((prev) => ({ ...prev, [fileId]: '' }));
    setActiveFileId(fileId);
    setCopyButtonText('Copy');
    setCursorPos({ line: 1, col: 1 });
    setFocusLine(null);
    setIsAddingFile(false);
    setNewFileName('');
  };

  const handleAddFile = () => {
    setIsAddingFile(true);
    setNewFileName('');
  };

  const handleAddFileSubmit = () => {
    if (!newFileName.trim()) {
      setIsAddingFile(false);
      setNewFileName('');
      return;
    }
    createNewFile(newFileName);
  };

  const handleDeleteFile = (fileIdToDelete) => {
    if (files.length <= 1) {
      setAssistantMessage({ content: 'At least one file must remain open.', type: 'error' });
      return;
    }

    const fileIndex = files.findIndex((file) => file.id === fileIdToDelete);
    if (fileIndex === -1) return;

    const nextFiles = files.filter((file) => file.id !== fileIdToDelete);
    setFiles(nextFiles);

    setFileContents((prev) => {
      const { [fileIdToDelete]: _removed, ...rest } = prev;
      return rest;
    });

    if (activeFileId === fileIdToDelete) {
      const fallbackFile = nextFiles[Math.max(0, fileIndex - 1)] || nextFiles[0];
      setActiveFileId(fallbackFile.id);
      setCursorPos({ line: 1, col: 1 });
      setFocusLine(null);
    }
  };

  return (
    <div className="workspace">
      <AssistantPanel
        ref={leftPanelRef}
        assistantMessage={assistantMessage}
        isLoading={isLoading}
        promptValue={promptInput}
        onPromptChange={setPromptInput}
        onPromptSubmit={handlePromptSubmit}
      />

      <div className="splitter" ref={splitterRef}></div>

      {/* RIGHT PANEL */}
      <div className="editor-panel">
        <div className="editor-tabs">
          <div className="tabs-left">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                className={`tab ${file.id === activeFile.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveFileId(file.id);
                  setCopyButtonText('Copy');
                  setCursorPos({ line: 1, col: 1 });
                  setFocusLine(null);
                  setReviewData(null);
                }}
              >
                <span className="tab-label">{file.name}</span>
                <button
                  type="button"
                  className="tab-close"
                  title={`Delete ${file.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file.id);
                  }}
                >
                  ×
                </button>
              </button>
            ))}
            <button
              type="button"
              className="tab tab-add"
              onClick={handleAddFile}
              title="Add file"
              disabled={isAddingFile}
            >
              +
            </button>
            {isAddingFile && (
              <input
                ref={newFileInputRef}
                type="text"
                className="tab tab-input"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={handleAddFileSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFileSubmit();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsAddingFile(false);
                    setNewFileName('');
                  }
                }}
                placeholder="file.txt"
              />
            )}
          </div>

          <div className="tabs-right">
            <button className="ghost-btn" onClick={onBackToLanding} disabled={isLoading}>Landing</button>
            <button className="copy-btn" onClick={handleCopy} disabled={isLoading}>{copyButtonText}</button>
          </div>
        </div>

        <ActionButtons onApiAction={performApiAction} isLoading={isLoading} />

        <Editor
          code={code}
          language={activeFile.language}
          onChange={handleEditorChange}
          onCursorChange={setCursorPos}
          focusLine={focusLine}
          onFocusLineHandled={() => setFocusLine(null)}
          isLoading={isLoading}
        />

        <ReviewDock
          reviewData={reviewData}
          onCardClick={handleCardClick}
          onResolveIssue={handleResolveIssue}
          fixingIssueId={fixingIssueId}
        />

        <div className="status-bar">
          <span>{activeFile.language}</span>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  const openWorkspace = () => {
    setIsWorkspaceOpen(true);
  };

  const backToLanding = () => {
    setIsWorkspaceOpen(false);
  };

  if (!isWorkspaceOpen) {
    return <LandingPage onStart={openWorkspace} />;
  }

  return <WorkspaceApp onBackToLanding={backToLanding} />;
}

export default App;

