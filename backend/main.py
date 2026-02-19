import json
import os
import re
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI()

# Enable CORS (IMPORTANT for frontend connection)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


class CodeRequest(BaseModel):
    code: str
    language: str


class ReviewIssue(BaseModel):
    id: str
    severity: str
    line: int
    message: str
    fix: str


class StructuredReviewResponse(BaseModel):
    score: int
    summary: str
    issues: list[ReviewIssue]


class FixIssueRequest(BaseModel):
    code: str
    language: str
    issue: ReviewIssue


class FixIssueResponse(BaseModel):
    fixed_code: str
    change_summary: str


class ChatMessage(BaseModel):
    role: str
    content: str


class PromptBarRequest(BaseModel):
    code: str
    language: str
    prompt: str
    history: list[ChatMessage] = Field(default_factory=list)


def _extract_json(raw_text: str) -> Optional[dict]:
    if not raw_text:
        return None

    stripped = raw_text.strip()
    if stripped.startswith("```"):
        first_newline = stripped.find("\n")
        last_fence = stripped.rfind("```")
        if first_newline != -1 and last_fence != -1 and last_fence > first_newline:
            stripped = stripped[first_newline + 1:last_fence].strip()

    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    try:
        return json.loads(stripped[start : end + 1])
    except json.JSONDecodeError:
        return None


def _extract_code_from_text(raw_text: str) -> str:
    if not raw_text:
        return ""

    stripped = raw_text.strip()
    fence_match = re.search(r"```[a-zA-Z0-9_-]*\n([\s\S]*?)```", stripped)
    if fence_match:
        return fence_match.group(1).strip("\n")

    if stripped.startswith("```"):
        first_newline = stripped.find("\n")
        last_fence = stripped.rfind("```")
        if first_newline != -1 and last_fence != -1 and last_fence > first_newline:
            return stripped[first_newline + 1:last_fence].strip("\n")
    return stripped


def _normalize_severity(severity: str) -> str:
    lower = (severity or "").strip().lower()
    if lower in {"critical", "high"}:
        return "high"
    if lower == "medium":
        return "medium"
    return "suggestion"


def _sanitize_structured_review(payload: dict, code: str) -> dict:
    if not isinstance(payload, dict):
        return {"score": 10, "summary": "No actionable issues found.", "issues": []}

    code_line_count = max(1, len(code.splitlines()))
    raw_issues = payload.get("issues")
    if not isinstance(raw_issues, list):
        raw_issues = []

    issues = []
    for index, issue in enumerate(raw_issues):
        if not isinstance(issue, dict):
            continue

        line_value = issue.get("line", 1)
        try:
            line_num = int(line_value)
        except (TypeError, ValueError):
            line_num = 1
        line_num = max(1, min(line_num, code_line_count))

        message = str(issue.get("message", "")).strip()
        if not message:
            continue

        issues.append(
            {
                "id": str(issue.get("id") or f"issue-{index + 1}-{line_num}"),
                "severity": _normalize_severity(str(issue.get("severity", ""))),
                "line": line_num,
                "message": message,
                "fix": str(issue.get("fix", "")).strip() or "Apply a minimal targeted fix.",
            }
        )

    raw_score = payload.get("score")
    try:
        score = int(raw_score)
    except (TypeError, ValueError):
        score = max(1, 10 - len(issues))
    score = max(1, min(score, 10))

    summary = str(payload.get("summary", "")).strip()
    if not summary:
        summary = "No actionable issues found." if not issues else f"{len(issues)} actionable issue(s) found."

    return {"score": score, "summary": summary, "issues": issues}


@app.get("/")
def root():
    return {"message": "Backend running successfully"}


@app.post("/review")
async def review_code(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    prompt = f"""
    You are an expert code reviewer.

    Review the following {request.language} code.
    Classify issues into:
    - Critical
    - High
    - Medium
    - Low

    Provide structured output.

    Code:
    {request.code}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000,
        )
        review_output = response.choices[0].message.content
        return {"review": review_output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/review-structured", response_model=StructuredReviewResponse)
async def review_structured(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    prompt = f"""
You are a strict code reviewer for {request.language}.
Find only concrete actionable defects and risky logic.
Ignore unnecessary lines and style-only suggestions.

Return JSON only in this exact schema:
{{
  "score": 1-10,
  "summary": "short summary",
  "issues": [
    {{
      "id": "stable-id",
      "severity": "critical|high|medium|low",
      "line": 1,
      "message": "one clear issue line",
      "fix": "one clear fix line"
    }}
  ]
}}

Rules:
- Keep each message short and specific.
- Keep each fix short and specific.
- If no issues, return empty issues and score 10.

Code:
{request.code}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1200,
        )
        raw_output = response.choices[0].message.content
        parsed = _extract_json(raw_output)
        sanitized = _sanitize_structured_review(parsed or {}, request.code)
        return sanitized
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rewrite")
async def rewrite_code(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    prompt = f"""
    You are an expert software engineer.

    Rewrite the following {request.language} code:
    - Improve readability
    - Improve performance
    - Follow best practices
    - Add proper minimal comments
    - Make it production-ready

    Return only the improved code.

    Code:
    {request.code}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1200,
        )
        rewritten = response.choices[0].message.content
        return {"rewritten_code": rewritten}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimize")
async def optimize_code(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    prompt = f"""
    Optimize the following {request.language} code.

    - Improve time complexity
    - Improve memory usage
    - Remove redundant logic
    - Keep functionality same

    Return only optimized code.

    Code:
    {request.code}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1200,
        )
        optimized = response.choices[0].message.content
        return {"optimized_code": optimized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fix-issue", response_model=FixIssueResponse)
async def fix_issue(request: FixIssueRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    prompt = f"""
You are an expert software engineer.
Fix only the issue below in the given {request.language} code.
Keep behavior unchanged except for that fix.
Keep edits minimal and avoid unrelated changes.
Prioritize changing only the reported line and the smallest nearby context required.
Do not refactor unrelated code.

Issue:
- Severity: {request.issue.severity}
- Line: {request.issue.line}
- Problem: {request.issue.message}
- Suggested fix: {request.issue.fix}

Return only the full updated code in a single fenced code block.
Do not return JSON.
Do not add explanations.

Code:
{request.code}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=3000,
        )
        raw_output = response.choices[0].message.content
        fixed_code = _extract_code_from_text(raw_output)
        change_summary = f"Applied fix for issue on line {request.issue.line}."

        if not fixed_code:
            raise HTTPException(status_code=502, detail="Failed to generate valid fixed code.")

        return {"fixed_code": fixed_code, "change_summary": change_summary}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/explain")
async def explain_code(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    prompt = f"""
    Explain the following {request.language} code clearly.

    - What it does
    - How it works
    - Important logic
    - Time complexity if applicable

    Code:
    {request.code}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000,
        )
        explanation = response.choices[0].message.content
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/promptbar")
async def promptbar_continue(request: PromptBarRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    safe_history = []
    for message in request.history[-12:]:
        role = (message.role or "").strip().lower()
        if role not in {"user", "assistant"}:
            continue
        content = (message.content or "").strip()
        if not content:
            continue
        safe_history.append({"role": role, "content": content})

    system_message = {
        "role": "system",
        "content": (
            "You are RefactorX, a code assistant. Continue the ongoing conversation naturally. "
            "Use the provided code as the latest source of truth and keep answers concise and actionable."
        ),
    }
    user_context = {
        "role": "user",
        "content": (
            f"Current language: {request.language}\n\n"
            f"Current code:\n{request.code}\n\n"
            f"Follow-up request: {request.prompt}"
        ),
    }

    messages = [system_message, *safe_history, user_context]

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.2,
            max_tokens=1200,
        )
        reply = response.choices[0].message.content
        return {"message": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
