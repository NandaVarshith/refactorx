document.addEventListener('DOMContentLoaded', () => {
  // --- Configuration ---
  const REVIEW_API_URL = 'http://127.0.0.1:8000/review';

  // --- DOM Elements ---
  const splitter = document.querySelector('.splitter');
  const leftPanel = document.querySelector('.assistant-panel');
  const editorArea = document.getElementById('editorArea');
  const copyBtn = document.getElementById('copyBtn');
  const cursorInfo = document.getElementById('cursorInfo');
  const reviewBtn = document.getElementById('reviewBtn');
  const rewriteBtn = document.getElementById('rewriteBtn');
  const explainBtn = document.getElementById('explainBtn');
  const optimizeBtn = document.getElementById('optimizeBtn');
  const reviewContent = document.getElementById('reviewContent');
  const reviewHeaderText = document.getElementById('reviewHeaderText');
  const qualityScoreText = document.getElementById('qualityScoreText');
  const reviewSummaryText = document.getElementById('reviewSummaryText');
  const assistantContent = document.querySelector('.assistant-content');

  const actionButtons = [reviewBtn, rewriteBtn, explainBtn, optimizeBtn];

  // --- State ---
  let isLoading = false;

  // --- Core Editor Functions (for div-based editor) ---

  /**
   * Reads the code from the div-based editor DOM and returns it as a string.
   */
  function getCode() {
    const codeLines = editorArea.querySelectorAll('.code-content');
    return Array.from(codeLines).map(line => line.textContent).join('\n');
  }

  /**
   * Renders a string of code into the div-based editor.
   * @param {string} codeString The code to display.
   */
  function updateCodeDisplay(codeString) {
    editorArea.innerHTML = ''; // Clear existing code
    const lines = codeString.split('\n');
    lines.forEach((line, index) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'code-line';

      const numberDiv = document.createElement('div');
      numberDiv.className = 'line-number';
      numberDiv.textContent = index + 1;

      const contentDiv = document.createElement('div');
      contentDiv.className = 'code-content';
      contentDiv.textContent = line; // Use textContent to prevent HTML injection

      lineDiv.appendChild(numberDiv);
      lineDiv.appendChild(contentDiv);
      editorArea.appendChild(lineDiv);
    });
  }

  // --- UI Update Functions ---

  function setButtonsLoading(loading, triggerBtn) {
    isLoading = loading;
    actionButtons.forEach(btn => {
      btn.disabled = loading;
    });

    if (triggerBtn) {
      const spinner = triggerBtn.querySelector('.btn-spinner');
      const text = triggerBtn.querySelector('.btn-text');
      if (spinner && text) {
        if (loading) {
          spinner.classList.remove('hidden');
          text.classList.add('hidden');
        } else {
          spinner.classList.add('hidden');
          text.classList.remove('hidden');
        }
      }
    }
  }

  function displayInAssistant(content, type = 'message') {
    const messageEl = document.createElement('div');
    messageEl.className = `assistant-message assistant-${type}`;
    messageEl.textContent = content;
    assistantContent.innerHTML = '';
    assistantContent.appendChild(messageEl);
  }

  function highlightLine(lineNumber) {
    const allLines = editorArea.querySelectorAll('.code-line');
    allLines.forEach(l => l.classList.remove('active'));
    if (allLines[lineNumber - 1]) {
      allLines[lineNumber - 1].classList.add('active');
      allLines[lineNumber - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function displayReviewResults(data) {
    reviewContent.innerHTML = '';
    const allLines = editorArea.querySelectorAll('.code-line');
    allLines.forEach(l => l.classList.remove('active'));

    if (!data.issues || data.issues.length === 0) {
      reviewHeaderText.textContent = 'Review';
      qualityScoreText.textContent = '';
      reviewSummaryText.textContent = 'No issues found. Great job!';
      return;
    }

    reviewHeaderText.textContent = `Review (${data.issues.length} Issues)`;
    qualityScoreText.textContent = `Quality: ${data.score}/10`;

    const severityCounts = { high: 0, medium: 0, suggestion: 0 };

    data.issues.forEach(issue => {
      severityCounts[issue.severity]++;
      const card = document.createElement('div');
      card.className = 'review-card';
      card.dataset.line = issue.line;
      card.innerHTML = `
        <div class="severity ${issue.severity}">${issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)} - Line ${issue.line}</div>
        ${issue.message}
      `;
      reviewContent.appendChild(card);
    });

    reviewSummaryText.innerHTML = ''; // Clear previous summary
    const severitiesToShow = [];
    if (severityCounts.high > 0) {
        severitiesToShow.push(`<span class="flex items-center">🔴<span class="ml-1.5">${severityCounts.high} High</span></span>`);
    }
    if (severityCounts.medium > 0) {
        severitiesToShow.push(`<span class="flex items-center">🟡<span class="ml-1.5">${severityCounts.medium} Medium</span></span>`);
    }
    if (severityCounts.suggestion > 0) {
        severitiesToShow.push(`<span class="flex items-center">🔵<span class="ml-1.5">${severityCounts.suggestion} Suggestion</span></span>`);
    }

    if (severitiesToShow.length > 0) {
        reviewSummaryText.innerHTML = severitiesToShow.join('');
    } else {
        reviewSummaryText.textContent = 'No issues found.';
    }
  }

  // --- API Call Logic ---

  async function performApiAction(endpoint, code, triggerBtn) {
    if (isLoading) return;
    setButtonsLoading(true, triggerBtn);
    displayInAssistant('Analyzing...', 'loading');
    clearReviewUI();

    if (endpoint !== 'review') {
      displayInAssistant(`"${endpoint}" is not wired to this backend yet.`, 'error');
      setButtonsLoading(false, triggerBtn);
      return null;
    }

    try {
      const response = await fetch(REVIEW_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'Java' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error?.message || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error(`API Error on /${endpoint}:`, error);
      displayInAssistant(`Error: ${error.message}`, 'error');
      return null;
    } finally {
      setButtonsLoading(false, triggerBtn);
    }
  }

  function clearReviewUI() {
    reviewContent.innerHTML = '';
    reviewHeaderText.textContent = 'Review';
    qualityScoreText.textContent = '';
    reviewSummaryText.innerHTML = '<span class="px-1">Run a review to see results.</span>';
    const allLines = editorArea.querySelectorAll('.code-line');
    allLines.forEach(l => l.classList.remove('active'));
  }

  // --- Event Listeners ---

  reviewBtn.addEventListener('click', async () => {
    const code = getCode();
    const data = await performApiAction('review', code, reviewBtn);
    if (data) {
      displayInAssistant(data.review || 'Review complete.');
      clearReviewUI();
    }
  });

  rewriteBtn.addEventListener('click', async () => {
    const code = getCode();
    const data = await performApiAction('rewrite', code, rewriteBtn);
    if (data) {
      updateCodeDisplay(data);
      displayInAssistant('Code has been rewritten.');
    }
  });

  explainBtn.addEventListener('click', async () => {
    const code = getCode();
    const data = await performApiAction('explain', code, explainBtn);
    if (data) {
      displayInAssistant(data);
    }
  });

  optimizeBtn.addEventListener('click', async () => {
    const code = getCode();
    const data = await performApiAction('optimize', code, optimizeBtn);
    if (data) {
      updateCodeDisplay(data);
      displayInAssistant('Code has been optimized.');
    }
  });

  copyBtn.addEventListener('click', () => {
    const code = getCode();
    navigator.clipboard.writeText(code)
      .then(() => {
        copyBtn.innerText = 'Copied!';
        setTimeout(() => copyBtn.innerText = 'Copy', 1500);
      })
      .catch(err => console.error('Failed to copy code: ', err));
  });

  // Event delegation for dynamically created review cards
  reviewContent.addEventListener('click', (e) => {
    const card = e.target.closest('.review-card');
    if (card) {
      const line = parseInt(card.dataset.line);
      highlightLine(line);
    }
  });

  // Panel resizing logic
  let isDragging = false;
  splitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const newLeftWidth = e.clientX;
      if (newLeftWidth > 260 && newLeftWidth < (window.innerWidth - 400)) {
        leftPanel.style.width = newLeftWidth + 'px';
      }
    }
  });

  // --- Initial Setup ---
  const initialCode = `class Solution {\n  public int almostPalindromic(String s) {\n    int n = s.length();\n    if (n <= 1) return n;\n  }\n}`;
  updateCodeDisplay(initialCode);
});
