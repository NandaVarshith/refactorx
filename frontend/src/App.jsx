import React, { useState, useEffect, useRef } from 'react';
import './App.css'
import AssistantPanel from '../components/AssistantPanel';
import ActionButtons from '../components/ActionButtons';
import Editor from '../components/Editor';
import ReviewDock from '../components/ReviewDock';

// --- Constants ---
const REVIEW_API_URL = 'http://127.0.0.1:8000/review';
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

function App() {
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

  // --- API Call Logic ---
  const performApiAction = async (actionName) => {
    if (isLoading) return;

    setIsLoading(true);
    setAssistantMessage({ content: 'Analyzing...', type: 'loading' });
    if (actionName !== 'review') {
      setReviewData(null);
      setAssistantMessage({ content: `"${actionName}" is not wired to this backend yet.`, type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(REVIEW_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: activeFile.language }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error?.message || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      setReviewData(null);
      setAssistantMessage({ content: data.review || 'Review complete.', type: 'message' });
    } catch (error) {
      console.error('API Error on /review:', error);
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
  };

  const handleCardClick = (lineNumber) => {
    setFocusLine(lineNumber);
    setCursorPos({ line: lineNumber, col: 1 });
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
          <button className="copy-btn" onClick={handleCopy} disabled={isLoading}>{copyButtonText}</button>
        </div>

        <ActionButtons onApiAction={performApiAction} isLoading={isLoading} />

        <Editor
          code={code}
          onChange={handleEditorChange}
          onCursorChange={setCursorPos}
          focusLine={focusLine}
          onFocusLineHandled={() => setFocusLine(null)}
          isLoading={isLoading}
        />

        <ReviewDock
          reviewData={reviewData}
          onCardClick={handleCardClick}
        />

        <div className="status-bar">
          <span>{activeFile.language}</span>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        </div>
      </div>
    </div>
  )
}

export default App;
