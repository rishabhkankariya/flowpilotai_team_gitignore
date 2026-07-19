# Remaining Tasks — Local LLM Integration & Server Restart

## Completed

- [x] Created `backend/app/services/llm.py` — centralized `get_llm()` function supporting both ChatOpenAI and ChatOllama
- [x] Added `USE_LOCAL_LLM` and `LOCAL_LLM_MODEL` settings to `backend/app/core/config.py`
- [x] Set `USE_LOCAL_LLM=true` and `LOCAL_LLM_MODEL=llama3:latest` in `backend/.env`
- [x] Updated `sales_agent.py` — replaced inline ChatOpenAI with `get_llm()`, removed unused import
- [x] Updated `support_agent.py` — replaced inline ChatOpenAI with `get_llm()`, removed unused import
- [x] Updated `finance_agent.py` — replaced inline ChatOpenAI with `get_llm()`, removed unused import
- [x] Updated `executive_agent.py` — replaced inline ChatOpenAI with `get_llm()`, removed unused import
- [x] Updated `intent_detection.py` — replaced inline ChatOpenAI with `get_llm()`, removed unused import
- [x] Updated `confidence_scoring.py` — replaced inline ChatOpenAI with `get_llm()`, removed unused import
- [x] Updated `is_mock` checks in all 6 files — now `not settings.USE_LOCAL_LLM and (placeholder key)` so local LLM bypasses mock fallback

## Remaining — Immediate

### 1. Start Ollama Server
```powershell
# Start Ollama serve in background (port 11434)
C:\Users\Rishabh Kankariya\AppData\Local\Programs\Ollama\ollama.exe serve
```
- Verify: `netstat -ano | findstr ":11434"`
- Verify model available: `ollama list` → should show `llama3:latest`

### 2. Start Backend Server
```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
- Verify: `http://localhost:8000/docs` loads Swagger UI

### 3. Start Frontend Server
```powershell
cd frontend
npm run dev
```
- Verify: `http://localhost:3000` loads login page

### 4. Test End-to-End with Local LLM
1. Login → go to Inbox
2. Submit a sales inquiry text → verify Sales Agent responds using llama3
3. Submit a support request → verify Support Agent responds
4. Upload an invoice PDF → verify Finance Agent responds via OCR + llama3
5. Check Dashboard → verify workflow status updates

## Remaining — Follow-up

- [ ] Verify OCR pipeline works with local models (pytesseract extracts text, llama3 analyzes it)
- [ ] Test `format="json"` output from Ollama — if llama3 doesn't obey JSON format, add retry/fallback logic in `get_llm()`
- [ ] Tune `temperature` and timeouts for local LLM (may need higher timeout than 20s for local inference)
- [ ] Add error handling if Ollama server is not running (graceful fallback message)
- [ ] Pull additional models if needed: `ollama pull llama3:latest` (already have it), `ollama pull phi3:mini`
- [ ] Test with PDF/image uploads to verify full OCR → local LLM pipeline
- [ ] Update `workflow.py` if any LangGraph node signature changes are needed
- [ ] Commit all changes once verified working

## Files Modified (uncommitted)

```
backend/app/services/llm.py              (NEW)
backend/app/core/config.py               (modified)
backend/app/agents/sales_agent.py        (modified)
backend/app/agents/support_agent.py      (modified)
backend/app/agents/finance_agent.py      (modified)
backend/app/agents/executive_agent.py    (modified)
backend/app/services/intent_detection.py (modified)
backend/app/services/confidence_scoring.py (modified)
backend/.env                             (modified)
```
