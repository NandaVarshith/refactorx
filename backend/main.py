from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os

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

# Request body model
class CodeRequest(BaseModel):
    code: str
    language: str

@app.get("/")
def root():
    return {"message": "Backend running successfully 🚀"}

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
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000,
        )

        review_output = response.choices[0].message.content

        return {"review": review_output}

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
