# Implementation Plan: FlowPilot AI — Autonomous Business Workflow Platform

## Overview

The implementation follows a five-day build order: Day 1 covers project scaffolding and core UI shells; Day 2 covers the backend API, database layer, and AI Inbox wiring; Day 3 covers LangGraph multi-agent logic; Day 4 covers charts, OCR, Document Intelligence, and Analytics; Day 5 covers polish, animations, and deployment readiness. Every task builds directly on the previous ones with no orphaned code.

---

## Tasks

### Day 1 — Project Setup, Dashboard UI, Sidebar, Login Page

- [ ] 1. Scaffold full-stack project structure and shared configuration
  - [ ] 1.1 Initialise Next.js 14 (App Router) frontend with TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, Recharts, and SWR
    - Run `create-next-app` with TypeScript template; install all frontend dependencies with pinned versions
    - Create `app/(auth)/login/`, `app/(protected)/dashboard/`, `app/(protected)/inbox/`, `app/(protected)/documents/`, `app/(protected)/analytics/` route folders with empty `page.tsx` stubs
    - _Requirements: 8, 10_
  - [ ]* 1.2 Write unit test — all route stubs render without crashing
    - Use Jest + React Testing Library; assert each stub page mounts successfully
    - _Requirements: 8, 10_
  - [ ] 1.3 Initialise FastAPI backend with Python 3.11; install pinned dependencies (fastapi, uvicorn, python-jose, bcrypt, supabase-py, langchain, langgraph, openai, pytesseract, pdf2image, pillow, hypothesis)
    - Create `app/` package with sub-packages: `auth/`, `inbox/`, `agents/`, `ocr/`, `analytics/`, `admin/`, `db/`
    - Add `main.py` that mounts all routers and configures CORS for `http://localhost:3000`
    - _Requirements: 1, 11, 12_

- [ ] 2. Implement custom JWT authentication (backend)
  - [ ] 2.1 Create `app/db/client.py` — Supabase singleton client that reads `SUPABASE_URL` and `SUPABASE_KEY` from environment; expose `execute`, `insert`, `select` async methods
    - _Requirements: 12.4_
  - [ ] 2.2 Create `app/db/migrations.py` — define `CREATE TABLE IF NOT EXISTS` SQL for all five tables (`users`, `workflow_runs`, `crm_leads`, `support_tickets`, `invoice_records`) in dependency order
    - _Requirements: 12.1_
  - [ ] 2.3 Implement `app/auth/router.py` — `POST /api/auth/register` and `POST /api/auth/login` endpoints using Pydantic `RegisterRequest` / `LoginRequest` / `TokenResponse` models; bcrypt password hashing (rounds=12); HS256 JWT signing with `JWT_SECRET` env var; 1-hour expiry
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ] 2.4 Implement `app/auth/middleware.py` — `get_current_user` FastAPI dependency that extracts Bearer token, decodes HS256 JWT, and raises HTTP 401 on invalid/expired tokens; inject `user_id` into `request.state`
    - _Requirements: 1.5_
  - [ ]* 2.5 Write property test for auth round trip (Property 1)
    - **Property 1: Auth Registration/Login Round Trip**
    - Use Hypothesis `st.emails()` × `st.text(min_size=8)` — register then login; assert decodable JWT with correct `sub` and `email` claims
    - **Validates: Requirements 1.1, 1.2**
  - [ ]* 2.6 Write property test for invalid credentials rejection (Property 2)
    - **Property 2: Invalid Credentials Rejected**
    - Generate random (email, password) pairs not present in users table; assert HTTP 401
    - **Validates: Requirements 1.3**
  - [ ]* 2.7 Write property test for JWT rejection on protected endpoints (Property 3)
    - **Property 3: Invalid JWT Rejected on Protected Endpoints**
    - Generate random strings and structurally invalid JWTs; call a protected endpoint; assert HTTP 401
    - **Validates: Requirements 1.5**

- [ ] 3. Build Login page and AuthContext (frontend)
  - [ ] 3.1 Implement `AuthContext` in `app/context/AuthContext.tsx` — stores JWT in memory and httpOnly cookie via `POST /api/auth/set-cookie` Next.js API route; exposes `token`, `userId`, `login()`, `logout()`; on any HTTP 401 from backend calls `logout()` and `router.push('/login')`
    - _Requirements: 1.6, 1.8_
  - [ ] 3.2 Implement `app/(protected)/layout.tsx` — `AuthGuard` wrapper that reads `AuthContext`; redirects unauthenticated users to `/login`
    - _Requirements: 1.7_
  - [ ] 3.3 Implement `app/(auth)/login/page.tsx` — email + password form using Shadcn `Input` and `Button`; calls `AuthContext.login()`; on success redirects to `/dashboard`; shows inline error on failure
    - _Requirements: 1.7_
  - [ ]* 3.4 Write unit tests for AuthContext and LoginPage
    - Assert login success redirects to `/dashboard`; assert login failure shows error message; assert logout clears token and redirects to `/login`
    - _Requirements: 1.6, 1.7, 1.8_

- [ ] 4. Build Sidebar navigation and Dashboard shell
  - [ ] 4.1 Create `components/Sidebar.tsx` — persistent sidebar with nav links to `/dashboard`, `/inbox`, `/documents`, `/analytics`; active route highlighting with Tailwind; collapsible on mobile
    - _Requirements: 8_
  - [ ] 4.2 Implement `app/(protected)/dashboard/page.tsx` — fetch metrics from `GET /api/dashboard/metrics` using `useDashboardMetrics` SWR hook (30-second refresh); render five metric cards (Today's Requests, Completed Workflows, Pending Workflows, Total Revenue, Open Tickets); render `AdminBanner` when `detail: "database_not_initialised"` is detected
    - _Requirements: 8.1, 8.5, 12.3_
  - [ ] 4.3 Add Recent Activity feed to Dashboard — fetch from `GET /api/dashboard/activity?limit=10`; render table with timestamp, intent label, agent, status columns; show empty state when array is empty
    - _Requirements: 8.3, 8.5_
  - [ ]* 4.4 Write unit test — Dashboard renders zero values and empty feed without errors
    - Mock API returning `{todayRequests:0, …}` and `[]`; assert no error thrown and metrics display `0`
    - _Requirements: 8.5_

- [ ] 5. Checkpoint — Day 1 baseline
  - Ensure all tests pass, ask the user if questions arise.

---

### Day 2 — Backend APIs, Database, File Upload, AI Inbox

- [ ] 6. Implement database admin endpoint and init-db resilience
  - [ ] 6.1 Implement `app/admin/router.py` — `POST /api/admin/init-db` endpoint (JWT-protected); runs all `CREATE TABLE IF NOT EXISTS` migrations from `app/db/migrations.py` in dependency order; returns `{message, tables_created: [str]}`; idempotent on repeated calls
    - _Requirements: 12.1, 12.2_
  - [ ] 6.2 Implement `AdminBanner` component in `components/AdminBanner.tsx` — hidden by default; shown when any SWR response contains `detail: "database_not_initialised"`; displays "Reinitialise Database" button that calls `POST /api/admin/init-db` then triggers SWR `mutate()`
    - _Requirements: 12.3_
  - [ ]* 6.3 Write property test for init-db idempotency (Property 15)
    - **Property 15: init-db Idempotency**
    - Call `POST /api/admin/init-db` 1–5 times in sequence; assert 2xx each time and all tables exist after each call
    - **Validates: Requirements 12.1, 12.2**
  - [ ]* 6.4 Write unit test — AdminBanner shows when `visible=true` and calls `onReinitialise` on button click
    - _Requirements: 12.3_

- [ ] 7. Implement Intent Detector
  - [ ] 7.1 Create `app/inbox/intent.py` — `IntentDetector` class with async `classify(text: str) -> IntentResult`; uses GPT-4o with a structured prompt that forces output to one of six labels and a confidence float; validates that `label` is in `VALID_LABELS` and `0.0 ≤ confidence ≤ 1.0` using Pydantic
    - _Requirements: 2.3, 2.4_
  - [ ]* 7.2 Write property test for intent label membership (Property 6)
    - **Property 6: Intent Label Membership Invariant**
    - Mock GPT response with values drawn from the full label space; assert returned label is always in `VALID_LABELS`
    - **Validates: Requirements 2.3**
  - [ ]* 7.3 Write property test for confidence score range (Property 7)
    - **Property 7: Confidence Score Range Invariant**
    - Mock GPT with arbitrary float values; assert Pydantic enforces `0.0 ≤ confidence ≤ 1.0`
    - **Validates: Requirements 2.4**

- [ ] 8. Implement `POST /api/inbox/submit` endpoint and file handling
  - [ ] 8.1 Create `app/inbox/router.py` — `POST /api/inbox/submit` multipart endpoint (JWT-protected); accepts `text` (optional, max 10,000 chars) or `file` (optional, UploadFile); validates text length → HTTP 422; validates file MIME type and size → HTTP 400 / HTTP 413; orchestrates Intent Detector; if confidence ≥ 0.5 dispatches to Agent Router; returns `WorkflowResult`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.7_
  - [ ] 8.2 Implement `GET /api/workflow/{run_id}/status` endpoint — JWT-protected; reads `workflow_runs` row from Supabase by `run_id`; returns `WorkflowResult` with current `steps_completed` and `status`
    - _Requirements: 2.8, 7.5_
  - [ ]* 8.3 Write property test for text input boundary validation (Property 4)
    - **Property 4: Text Input Boundary Validation**
    - Use Hypothesis `st.text(max_size=15_000)`; assert accepted iff length ≤ 10,000 (HTTP 200 vs HTTP 422)
    - **Validates: Requirements 2.1**
  - [ ]* 8.4 Write property test for file upload validation (Property 5)
    - **Property 5: File Upload Validation**
    - Generate (MIME type, size) pairs; assert HTTP 200 for valid pairs, HTTP 400 for wrong MIME, HTTP 413 for oversized
    - **Validates: Requirements 2.2, 9.1, 9.4**

- [ ] 9. Build AI Inbox frontend page
  - [ ] 9.1 Implement `app/(protected)/inbox/page.tsx` — text area (max 10,000 chars) + file upload dropzone (PDF/PNG/JPG/JPEG, max 10 MB) with client-side validation; submits to `POST /api/inbox/submit`; displays returned intent label and confidence score; shows low-confidence warning and manual category selector when `confidence < 0.5`; mounts `WorkflowViewer` on submission
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.8_
  - [ ] 9.2 Create `app/db/models.py` — `workflow_runs` insert helper; write new `workflow_runs` row with `status: pending` at submission time, updated to `running/completed/failed` by agents
    - _Requirements: 11.3, 12.4_
  - [ ]* 9.3 Write unit test — AI Inbox shows low-confidence warning when confidence < 0.5
    - Mock API returning `{confidence: 0.3, label: "general"}`; assert warning banner and category selector render
    - _Requirements: 2.6_

- [ ] 10. Checkpoint — Day 2 baseline
  - Ensure all tests pass, ask the user if questions arise.

---

### Day 3 — AI Agents (LangGraph), Email Classification, AI Reply Generation, Workflow Engine

- [ ] 11. Implement shared LangGraph infrastructure and Agent Router
  - [ ] 11.1 Create `app/agents/state.py` — define `AgentState` TypedDict with keys: `run_id`, `intent_label`, `raw_text`, `ocr_text`, `metadata`, `steps_completed`, `output`, `error`
    - _Requirements: 11.2, 11.5_
  - [ ] 11.2 Create `app/agents/router.py` — `AgentRouter` class; implements top-level `StateGraph[AgentState]` with `classify_intent` node (calls `IntentDetector`) and conditional `route_to_agent` edge that branches on `intent_label` to the correct agent subgraph; exposes `dispatch(state: AgentState) -> WorkflowResult`
    - _Requirements: 2.7, 11.1, 11.5_
  - [ ] 11.3 Implement `GET /api/agents/status` endpoint in `app/agents/router.py` — JWT-protected; queries `workflow_runs` for rows with `status IN ('pending','running')`; returns `{active_runs: [{run_id, agent, status, started_at}]}`
    - _Requirements: 11.4_
  - [ ]* 11.4 Write property test for agent routing correctness (Property 8)
    - **Property 8: Agent Routing Correctness**
    - Generate random valid `intent_label` values; assert dispatched agent matches the defined mapping; assert full context present in dispatched state
    - **Validates: Requirements 2.7, 11.1, 11.5**

- [ ] 12. Implement Sales Agent (LangGraph)
  - [ ] 12.1 Create `app/agents/sales.py` — `SalesAgent` with `CompiledStateGraph` executing five nodes in order: `extract_sender_info` (GPT), `generate_quotation` (GPT → `Quotation` Pydantic model), `draft_reply_email` (GPT), `generate_meeting_suggestion` (GPT), `persist_to_supabase` (inserts `crm_leads` row with quotation/reply linked by FK); each node appends its name to `state['steps_completed']`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.2_
  - [ ]* 12.2 Write property test for Sales Agent output completeness (Property 9)
    - **Property 9: Sales Agent Output Completeness**
    - Generate arbitrary `sales_inquiry` texts; mock GPT; assert quotation has ≥1 item with unit price and numeric total; CRM Lead contains all required fields with status `new`; reply references sender; meeting suggestion has agenda + time slot; Supabase row linked by FK
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**

- [ ] 13. Implement Support Agent (LangGraph)
  - [ ] 13.1 Create `app/agents/support.py` — `SupportAgent` with `CompiledStateGraph` executing four nodes: `extract_sender_info` (GPT), `classify_severity` (GPT — detects keywords: legal, lawsuit, urgent, fraud → sets `severity`), `generate_summary_or_faq` (GPT — summary ≤150w for complaints; FAQ answer for faqs), `persist_ticket` (inserts `support_tickets` row; status `escalated` if high severity, else `open`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.2_
  - [ ]* 13.2 Write property test for Support Ticket completeness and escalation (Property 10)
    - **Property 10: Support Ticket Completeness and Escalation**
    - Generate complaint/faq texts with and without escalation keywords; assert required ticket fields always present; assert status is `escalated` iff text contains escalation keyword; assert summary ≤ 150 words; assert FAQ answer non-empty for faq items
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 14. Implement Finance Agent (LangGraph) and OCR Engine
  - [ ] 14.1 Create `app/ocr/engine.py` — `OCREngine` class with async `extract_text(file_bytes, content_type) -> str`; uses `pytesseract` with `lang="eng"` for images; `pdf2image.convert_from_bytes` + pytesseract for PDFs; raises `ValueError` for unsupported MIME types
    - _Requirements: 5.1, 9.2, 9.5_
  - [ ] 14.2 Create `app/agents/finance.py` — `FinanceAgent` with `CompiledStateGraph` executing four nodes: `ocr_extract` (calls `OCREngine` — skipped if plain text input), `parse_invoice_fields` (GPT structured extraction → `InvoiceRecord` Pydantic model), `validate_required_fields` (Python: checks `vendor_name` and `total_amount_due`; sets `partial_warning=True` and nulls missing fields), `persist_invoice_record` (inserts `invoice_records` row linked to `workflow_run` by FK)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 11.2_
  - [ ]* 14.3 Write property test for Invoice Extraction and Persistence (Property 11)
    - **Property 11: Invoice Extraction and Persistence**
    - Use fixture invoices; vary which required fields are absent; assert extracted fields match source; assert `partial_warning=True` and null fields when vendor_name or total_amount_due missing; assert Supabase row linked by FK
    - **Validates: Requirements 5.2, 5.3, 5.5**

- [ ] 15. Implement Executive Agent (LangGraph)
  - [ ] 15.1 Create `app/agents/executive.py` — `ExecutiveAgent` with `CompiledStateGraph` executing three nodes: `query_supabase` (fetches today's UTC workflow_runs, crm_leads, support_tickets, invoice_records), `generate_summary` (GPT — plain-language summary ≤300 words), `generate_recommendations` (GPT — list of ≥3 next-action items); returns `ExecutiveSummary`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 11.2_
  - [ ]* 15.2 Write property test for Executive Summary bounds (Property 12)
    - **Property 12: Executive Summary Bounds**
    - Generate random day-data dicts; mock GPT; assert summary word count ≤ 300; assert len(recommendations) ≥ 3
    - **Validates: Requirements 6.2, 6.3**

- [ ] 16. Build WorkflowViewer component
  - [ ] 16.1 Create `components/WorkflowViewer.tsx` — renders the seven fixed nodes (`Email Received → Intent Detection → Agent Routing → Agent Execution → Actions → CRM / Reply / Record → Completed`) as `motion.div` elements using Framer Motion; polls `GET /api/workflow/{run_id}/status` every 1.5 seconds; maps `steps_completed` list to node statuses (`idle | active | success | error`); `active` triggers indigo pulse animation; `success` shows green border + checkmark; `error` shows red border + X icon and halts polling; displays elapsed seconds below the graph
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ]* 16.2 Write unit tests for WorkflowViewer
    - Assert all 7 nodes render; assert `active` class applied to correct node when `steps_completed` changes; assert error state halts animation
    - _Requirements: 7.1, 7.2, 7.4_

- [ ] 17. Wire `/api/process` contract and complete inbox integration
  - [ ] 17.1 Ensure `POST /api/inbox/submit` returns `WorkflowResult` with non-empty `steps_completed` list and non-empty `output` dict for every valid intent label; connect Agent Router to inbox endpoint so result flows back to caller
    - _Requirements: 11.3_
  - [ ]* 17.2 Write property test for `/api/process` response contract (Property 14)
    - **Property 14: /api/process Response Contract**
    - Generate valid item payloads across all intent labels (with mocked agents); assert every response contains non-empty `steps_completed` list and non-empty `output` dict
    - **Validates: Requirements 11.3**

- [ ] 18. Checkpoint — Day 3 agents complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Day 4 — Dashboard Charts, OCR, Document Intelligence, Analytics

- [ ] 19. Implement Dashboard analytics chart and AI Suggestions
  - [ ] 19.1 Add `GET /api/dashboard/metrics` endpoint in `app/analytics/router.py` — JWT-protected; queries `workflow_runs` for today's counts grouped by status and intent_label; queries `crm_leads` for revenue sum; queries `support_tickets` for open count; returns `DashboardMetrics`; returns zeros when no rows found
    - _Requirements: 8.1, 8.5_
  - [ ] 19.2 Add `GET /api/dashboard/activity` endpoint — JWT-protected; queries last 10 `workflow_runs` rows ordered by `created_at` DESC; returns `[ActivityItem]`
    - _Requirements: 8.3_
  - [ ] 19.3 Implement Recharts workflow activity bar chart in `app/(protected)/dashboard/page.tsx` — displays count of workflow runs by category (`sales_inquiry`, `support`, `invoice`, `general`) for the current day; renders empty chart with no errors when data is empty
    - _Requirements: 8.2, 8.5_
  - [ ] 19.4 Add AI Suggestions panel to Dashboard — calls `POST /api/inbox/submit` with Executive Agent query "What happened today?"; displays returned `recommendations` list (≥3 items); refreshed on each Executive Agent query
    - _Requirements: 8.4_
  - [ ]* 19.5 Write property test for Recent Activity truncation (Property 13)
    - **Property 13: Dashboard Recent Activity Truncation**
    - Insert 0–50 workflow_run rows; call `GET /api/dashboard/activity`; assert response contains exactly `min(n, 10)` items ordered by `created_at` DESC
    - **Validates: Requirements 8.3**

- [ ] 20. Implement Document Intelligence page
  - [ ] 20.1 Implement `app/(protected)/documents/page.tsx` — file upload dropzone (PDF/PNG/JPG/JPEG ≤10 MB) with client-side format and size validation; on upload calls `POST /api/inbox/submit` with Finance Agent path; after processing displays extracted Invoice Record grouped into four sections: Vendor Information, Line Items, Tax & Totals, Payment Details; shows partial extraction warning banner when `partial_warning=true`
    - _Requirements: 9.1, 9.3, 9.4, 5.5_
  - [ ]* 20.2 Write unit test — Document Intelligence renders extracted fields grouped by section
    - Mock Finance Agent response with known fixture data; assert four section headers and correct field values render
    - _Requirements: 9.3_

- [ ] 21. Implement Analytics page and backend analytics endpoint
  - [ ] 21.1 Create `app/analytics/router.py` — `GET /api/analytics/metrics` endpoint (JWT-protected); returns `AnalyticsMetrics` with: `requestsByHour` (last 24 hours), `salesVsSupport` (last 7 days), `pendingByAgent` (pie data), `workflowsByAgent` (bar data); returns empty arrays when no data exists
    - _Requirements: 10.1, 10.2, 10.4_
  - [ ] 21.2 Implement `app/(protected)/analytics/page.tsx` — four Recharts charts using `useAnalyticsData` SWR hook (60-second refresh): Requests Today (bar chart by hour), Sales vs Support (grouped bar chart last 7 days), Pending Tasks (pie chart by agent), Agent Usage (bar chart by agent); render "No data available" label for empty data sets
    - _Requirements: 10.1, 10.3, 10.4_
  - [ ]* 21.3 Write unit test — Analytics page renders "No data available" on empty arrays
    - Mock API returning empty arrays for all fields; assert "No data available" labels render for each chart
    - _Requirements: 10.4_

- [ ] 22. Checkpoint — Day 4 features complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Day 5 — Animations, Deployment Readiness, Demo Preparation

- [ ] 23. Polish Framer Motion animations and UI
  - [ ] 23.1 Refine `WorkflowViewer` animations — add stagger transitions between node activations; add completion celebration animation (e.g., green pulse cascade) when all steps reach `success`; add smooth entrance animation for the graph on mount
    - _Requirements: 7.2, 7.3_
  - [ ] 23.2 Add page-transition animations — wrap each `(protected)` page in a `motion.div` with `initial={{ opacity: 0, y: 8 }}` / `animate={{ opacity: 1, y: 0 }}` entrance transition; add loading skeletons for metric cards while SWR is fetching
    - _Requirements: 8_
  - [ ] 23.3 Implement global error toast system — add `ToastProvider` using Shadcn `Toast`; emit toast on GPT/timeout errors (502/504 responses) with retry button; emit toast on file validation errors
    - _Requirements: 2.1, 2.2_

- [ ] 24. Environment configuration and deployment readiness
  - [ ] 24.1 Create `.env.example` files for both frontend and backend listing all required environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `OPENAI_API_KEY`, `NEXT_PUBLIC_API_URL`); create `README.md` with setup and run instructions
    - _Requirements: 1.4, 12_
  - [ ] 24.2 Add `Dockerfile` for the FastAPI backend — uses Python 3.11-slim base; installs system dependencies for Tesseract (`tesseract-ocr`, `poppler-utils`); copies app; exposes port 8000
    - _Requirements: 9.5_
  - [ ] 24.3 Add startup check in `main.py` — on application startup, attempt to connect to Supabase and call `init-db` logic; log warning (do not crash) if Supabase is unreachable, so the app degrades gracefully
    - _Requirements: 12.4_

- [ ] 25. Integration tests and edge-case coverage
  - [ ]* 25.1 Write integration test — end-to-end submission with real text fixture for each of the four agents
    - Submit known text for `sales_inquiry`, `support_complaint`, `support_faq`, `invoice`; assert `WorkflowResult` has correct agent, non-empty `steps_completed`, and non-empty `output`
    - _Requirements: 11.3_
  - [ ]* 25.2 Write integration test — Dashboard metrics endpoint reflects counts after known DB inserts
    - Insert known rows; call `GET /api/dashboard/metrics`; assert counts match
    - _Requirements: 8.1_
  - [ ]* 25.3 Write edge-case tests
    - Confidence < 0.5 shows manual-selection UI; WorkflowViewer halts and shows error on failed step; Dashboard zero state after simulated DB reset; Analytics "No data available" on empty arrays; frontend redirects to `/login` on expired JWT; AdminBanner appears on `database_not_initialised` detail
    - _Requirements: 2.6, 7.4, 8.5, 10.4, 1.8, 12.3_

- [ ] 26. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property tests use **Hypothesis** (Python backend) or **fast-check** (TypeScript frontend) with a minimum of 100 iterations
- Each task references specific requirements for full traceability
- Checkpoints at Days 1–5 boundaries ensure incremental validation
- Property tests validate the 15 correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `init-db` endpoint must be called once after first deployment or after a Supabase weekly reset

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.3"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.2", "1.2"]
    },
    {
      "id": 2,
      "tasks": ["2.3", "2.4", "4.1"]
    },
    {
      "id": 3,
      "tasks": ["2.5", "2.6", "2.7", "3.1", "3.2", "3.3"]
    },
    {
      "id": 4,
      "tasks": ["3.4", "4.2", "6.1", "11.1"]
    },
    {
      "id": 5,
      "tasks": ["4.3", "4.4", "6.2", "7.1", "9.2", "11.2", "11.3"]
    },
    {
      "id": 6,
      "tasks": ["4.4", "6.3", "6.4", "7.2", "8.1", "9.3", "11.4"]
    },
    {
      "id": 7,
      "tasks": ["8.2", "8.3", "8.4", "12.1", "13.1", "14.1", "15.1"]
    },
    {
      "id": 8,
      "tasks": ["8.4", "9.1", "12.2", "13.2", "14.2", "14.3", "15.2", "16.1"]
    },
    {
      "id": 9,
      "tasks": ["9.3", "16.2", "17.1", "19.1", "19.2", "20.1", "21.1"]
    },
    {
      "id": 10,
      "tasks": ["17.2", "19.3", "19.4", "19.5", "20.2", "21.2"]
    },
    {
      "id": 11,
      "tasks": ["21.3", "23.1", "23.2", "23.3"]
    },
    {
      "id": 12,
      "tasks": ["24.1", "24.2", "24.3"]
    },
    {
      "id": 13,
      "tasks": ["25.1", "25.2", "25.3"]
    }
  ]
}
```
