# Design Document — FlowPilot AI

## Overview

FlowPilot AI is an autonomous business workflow platform. Users submit emails or documents through a browser-based frontend; the backend classifies the content, routes it to a specialised LangGraph agent, executes a structured workflow, persists the results to Supabase, and streams live status updates back to the frontend. The frontend then renders the executed workflow as an animated directed graph and surfaces aggregated metrics on a live dashboard.

The stack is:
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, Recharts
- **Backend**: FastAPI (Python 3.11), LangChain, LangGraph, OpenAI GPT-4o, Tesseract OCR
- **Database**: Supabase (hosted PostgreSQL)
- **Auth**: Custom JWT — bcrypt password hashing, HS256-signed tokens

---

## Architecture

### System Topology

```
Browser
  │
  ▼
Next.js Frontend  (port 3000)
  │  REST + polling
  ▼
FastAPI Backend   (port 8000)
  ├── Auth Service       (JWT issue / validation)
  ├── Intent Detector    (GPT-4o classification)
  ├── Agent Router       (LangGraph StateGraph)
  │     ├── Sales Agent        (LangGraph StateGraph)
  │     ├── Support Agent      (LangGraph StateGraph)
  │     ├── Finance Agent      (LangGraph StateGraph + Tesseract)
  │     └── Executive Agent    (LangGraph StateGraph)
  └── Supabase Client    (asyncpg / supabase-py)
        │
        ▼
      Supabase PostgreSQL
```

### Request Lifecycle

1. The user authenticates via `/login` — the frontend stores the JWT.
2. The user submits a text or file to the AI Inbox (`POST /api/inbox/submit`).
3. The backend runs the Intent Detector and returns a classification + confidence score.
4. If confidence ≥ 0.5 the backend immediately routes to the Agent Router; otherwise the frontend prompts the user to confirm/override the label.
5. The Agent Router dispatches the item to the correct LangGraph StateGraph.
6. The agent executes its nodes, writes results to Supabase, and returns a `WorkflowResult` including completed step names and final output.
7. The frontend polls `GET /api/workflow/{run_id}/status` to drive the Workflow Viewer animation.
8. Dashboard and Analytics pages poll their respective endpoints on a timer to keep metrics current.

---

## Component Breakdown

### Frontend Components

| Component | Route | Responsibility |
|---|---|---|
| `AuthProvider` | global | Stores JWT in memory; injects `Authorization` header; redirects on 401 |
| `LoginPage` | `/login` | Email + password form; calls `/api/auth/login`; redirects to `/dashboard` |
| `Dashboard` | `/dashboard` | Live metrics, Recharts activity chart, Recent Activity feed, AI Suggestions |
| `AIInbox` | `/inbox` | Text area + file upload; displays classification result + Workflow Viewer |
| `WorkflowViewer` | (embedded) | Framer Motion directed-graph animation of workflow steps |
| `DocumentIntelligence` | `/documents` | File upload interface; displays structured Invoice Record fields |
| `Analytics` | `/analytics` | Four Recharts charts with 60-second auto-refresh |
| `AdminBanner` | (embedded) | "Database not initialised" banner + init-db button |

### Backend Modules

| Module | Path | Responsibility |
|---|---|---|
| `auth` | `app/auth/` | `/api/auth/register`, `/api/auth/login`, JWT middleware |
| `inbox` | `app/inbox/` | `/api/inbox/submit`, orchestrates Intent Detector + Agent Router |
| `agents` | `app/agents/` | LangGraph graphs for each of the four agents |
| `ocr` | `app/ocr/` | Tesseract wrapper; called by Finance Agent and Document Intelligence |
| `analytics` | `app/analytics/` | `/api/analytics/metrics`, `/api/analytics/charts` |
| `admin` | `app/admin/` | `/api/admin/init-db` |
| `db` | `app/db/` | Supabase client singleton, table init SQL, schema models |

---

## Data Models

### Supabase Tables

#### `users`
```sql
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `workflow_runs`
```sql
CREATE TABLE IF NOT EXISTS workflow_runs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(id),
    intent_label  TEXT NOT NULL,
    confidence    FLOAT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending | running | completed | failed
    agent         TEXT NOT NULL,
    raw_text      TEXT,
    ocr_text      TEXT,
    steps_completed JSONB DEFAULT '[]',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    completed_at  TIMESTAMPTZ
);
```

#### `crm_leads`
```sql
CREATE TABLE IF NOT EXISTS crm_leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_run_id UUID REFERENCES workflow_runs(id),
    sender_name     TEXT,
    company         TEXT,
    contact_email   TEXT,
    inquiry_summary TEXT,
    status          TEXT NOT NULL DEFAULT 'new',
    quotation       JSONB,
    reply_email     TEXT,
    meeting_suggestion JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `support_tickets`
```sql
CREATE TABLE IF NOT EXISTS support_tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_run_id UUID REFERENCES workflow_runs(id),
    sender_info     JSONB,
    issue_summary   TEXT,
    category        TEXT NOT NULL,   -- complaint | faq
    status          TEXT NOT NULL DEFAULT 'open',  -- open | escalated | closed
    faq_answer      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `invoice_records`
```sql
CREATE TABLE IF NOT EXISTS invoice_records (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_run_id   UUID REFERENCES workflow_runs(id),
    vendor_name       TEXT,
    invoice_number    TEXT,
    invoice_date      TEXT,
    line_items        JSONB,
    subtotal          NUMERIC,
    tax_amount        NUMERIC,
    total_amount_due  NUMERIC,
    payment_due_date  TEXT,
    partial_warning   BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### Python Pydantic Models

#### Auth

```python
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

#### Inbox / Processing

```python
class InboxSubmitRequest(BaseModel):
    text: Optional[str] = Field(None, max_length=10_000)
    # file handled as UploadFile in the endpoint

class IntentResult(BaseModel):
    label: Literal[
        "sales_inquiry", "support_complaint", "support_faq",
        "invoice", "contract", "general"
    ]
    confidence: float = Field(ge=0.0, le=1.0)

class WorkflowResult(BaseModel):
    run_id: str
    agent: str
    status: str
    steps_completed: list[str]
    output: dict
    elapsed_seconds: float
```

#### Agent-Specific Outputs

```python
class Quotation(BaseModel):
    items: list[dict]   # [{description, unit_price, quantity}]
    total: float

class CRMLead(BaseModel):
    sender_name: Optional[str]
    company: Optional[str]
    contact_email: Optional[str]
    inquiry_summary: str
    status: str = "new"

class SalesAgentOutput(BaseModel):
    quotation: Quotation
    crm_lead: CRMLead
    reply_email: str
    meeting_suggestion: dict   # {agenda, suggested_time}

class SupportTicket(BaseModel):
    sender_info: dict
    issue_summary: str
    category: str
    status: str
    faq_answer: Optional[str]

class InvoiceRecord(BaseModel):
    vendor_name: Optional[str]
    invoice_number: Optional[str]
    invoice_date: Optional[str]
    line_items: list[dict]
    subtotal: Optional[float]
    tax_amount: Optional[float]
    total_amount_due: Optional[float]
    payment_due_date: Optional[str]
    partial_warning: bool

class ExecutiveSummary(BaseModel):
    summary: str   # ≤ 300 words
    recommendations: list[str]   # ≥ 3 items
```

#### LangGraph State Types

```python
# Shared base state
class AgentState(TypedDict):
    run_id: str
    intent_label: str
    raw_text: str
    ocr_text: Optional[str]
    metadata: dict
    steps_completed: List[str]
    output: Optional[dict]
    error: Optional[str]
```

---

## API Design

### Auth Endpoints

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | None | `RegisterRequest` | `TokenResponse` |
| POST | `/api/auth/login` | None | `LoginRequest` | `TokenResponse` |

### Inbox / Processing Endpoints

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/inbox/submit` | JWT | multipart: `text` or `file`, optional `override_label` | `WorkflowResult` |
| GET | `/api/workflow/{run_id}/status` | JWT | — | `WorkflowResult` |

### Agent Status

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/agents/status` | JWT | — | `{active_runs: [{run_id, agent, status, started_at}]}` |

### Dashboard / Analytics

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/dashboard/metrics` | JWT | — | `DashboardMetrics` |
| GET | `/api/dashboard/activity` | JWT | `?limit=10` | `[ActivityItem]` |
| GET | `/api/analytics/metrics` | JWT | — | `AnalyticsMetrics` |

### Admin

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/admin/init-db` | JWT | — | `{message, tables_created: [str]}` |

---

## LangGraph Agent Designs

### Agent Router Graph

```
[start]
    │
    ▼
classify_intent         (calls GPT-4o)
    │
    ▼
route_to_agent          (conditional edge — branches on intent_label)
    ├──────────────────────────────────────┐
    │  sales_inquiry                       │  support_complaint / support_faq
    ▼                                      ▼
[Sales Agent]                         [Support Agent]
    │  invoice                             │  general / contract
    ▼                                      ▼
[Finance Agent]                       [Executive Agent]
```

The router itself is a `StateGraph[AgentState]` with `route_to_agent` as a conditional node that returns the name of the next subgraph to invoke.

### Sales Agent Graph

```
[start]
    │
    ▼
extract_sender_info     (GPT: extract name, company, email from raw_text)
    │
    ▼
generate_quotation      (GPT: produce Quotation JSON)
    │
    ▼
draft_reply_email       (GPT: compose reply referencing Quotation)
    │
    ▼
generate_meeting_suggestion  (GPT: propose agenda + time)
    │
    ▼
persist_to_supabase     (write crm_leads row, link quotation/reply)
    │
    ▼
[end]
```

State keys added: `sender_info`, `quotation`, `reply_email`, `meeting_suggestion`, `crm_lead_id`

### Support Agent Graph

```
[start]
    │
    ▼
extract_sender_info     (GPT)
    │
    ▼
classify_severity       (GPT: detect escalation keywords)
    │
    ▼
generate_summary_or_faq (GPT: summary ≤150w for complaints; FAQ answer for faqs)
    │
    ▼
persist_ticket          (write support_tickets row)
    │
    ▼
[end]
```

State keys added: `sender_info`, `severity`, `ticket_summary`, `faq_answer`, `ticket_id`

### Finance Agent Graph

```
[start]
    │
    ▼
ocr_extract             (Tesseract; only if file input — skipped for plain text)
    │
    ▼
parse_invoice_fields    (GPT: structured extraction from OCR text)
    │
    ▼
validate_required_fields (Python: check vendor_name + total_amount_due)
    │
    ▼
persist_invoice_record  (write invoice_records row)
    │
    ▼
[end]
```

State keys added: `ocr_text`, `invoice_record`, `partial_warning`

### Executive Agent Graph

```
[start]
    │
    ▼
query_supabase          (fetch today's workflow_runs, crm_leads, support_tickets, invoice_records)
    │
    ▼
generate_summary        (GPT: produce plain-language summary ≤300w)
    │
    ▼
generate_recommendations (GPT: produce ≥3 next-action items)
    │
    ▼
[end]
```

State keys added: `day_data`, `summary`, `recommendations`

---

## Frontend Architecture

### Routing (App Router)

```
app/
├── (auth)/
│   └── login/page.tsx          — LoginPage
├── (protected)/
│   ├── layout.tsx              — AuthGuard wrapper
│   ├── dashboard/page.tsx      — Dashboard
│   ├── inbox/page.tsx          — AIInbox
│   ├── documents/page.tsx      — DocumentIntelligence
│   └── analytics/page.tsx      — Analytics
└── api/                        — Next.js API routes (proxies to FastAPI if needed)
```

### State Management

Global auth state is held in a React Context (`AuthContext`) that exposes `token`, `login()`, `logout()`. The context reads/writes the JWT in an httpOnly cookie via Next.js API route middleware. All data-fetching components use SWR with the `fetcher` function that injects `Authorization: Bearer <token>`.

### WorkflowViewer Component

```tsx
// Node definition
interface WorkflowNode {
  id: string;
  label: string;
  status: 'idle' | 'active' | 'success' | 'error';
}

const WORKFLOW_NODES: WorkflowNode[] = [
  { id: 'email_received',   label: 'Email Received',    status: 'idle' },
  { id: 'intent_detection', label: 'Intent Detection',  status: 'idle' },
  { id: 'agent_routing',    label: 'Agent Routing',     status: 'idle' },
  { id: 'agent_execution',  label: 'Agent Execution',   status: 'idle' },
  { id: 'actions',          label: 'Actions',           status: 'idle' },
  { id: 'crm_reply_record', label: 'CRM / Reply / Record', status: 'idle' },
  { id: 'completed',        label: 'Completed',         status: 'idle' },
];
```

Each node is rendered as a `motion.div` (Framer Motion). The `active` state triggers a `animate={{ boxShadow: ["0 0 0px #6366f1", "0 0 16px #6366f1", "0 0 0px #6366f1"] }}` pulse. The `success` state switches the border to green and shows a checkmark. The `error` state turns the border red and shows an X. The viewer polls `GET /api/workflow/{run_id}/status` every 1.5 seconds and maps `steps_completed` to node statuses.

### Dashboard Polling

```typescript
// useDashboardMetrics.ts
export function useDashboardMetrics() {
  return useSWR<DashboardMetrics>('/api/dashboard/metrics', fetcher, {
    refreshInterval: 30_000,
  });
}
```

### Analytics Polling

```typescript
// useAnalyticsData.ts
export function useAnalyticsData() {
  return useSWR<AnalyticsMetrics>('/api/analytics/metrics', fetcher, {
    refreshInterval: 60_000,
  });
}
```

---

## Authentication Design

### JWT Structure

```json
{
  "sub": "<user_id (UUID)>",
  "email": "<user_email>",
  "iat": <issued_at>,
  "exp": <issued_at + 3600>
}
```

Token expiry: 1 hour. Algorithm: HS256. Secret loaded from `JWT_SECRET` environment variable.

### Auth Flow

```
Register:
  POST /api/auth/register {email, password}
    → validate email format, password ≥ 8 chars
    → bcrypt.hashpw(password, bcrypt.gensalt(rounds=12))
    → INSERT INTO users (email, password_hash)
    → return JWT signed with HS256

Login:
  POST /api/auth/login {email, password}
    → SELECT password_hash FROM users WHERE email = ?
    → bcrypt.checkpw(password, password_hash)
    → if mismatch → HTTP 401
    → return JWT

Protected endpoint:
  → Extract "Bearer <token>" from Authorization header
  → jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
  → if expired or invalid → HTTP 401
  → inject user_id into request.state
```

### Frontend Token Handling

The frontend stores the JWT as an httpOnly cookie set via a Next.js API route (`/api/auth/set-cookie`). On each authenticated fetch, the Next.js middleware reads the cookie and injects the `Authorization` header. On receipt of any HTTP 401 from the FastAPI backend, `AuthContext.logout()` is called, the cookie is cleared, and `router.push('/login')` is invoked.

---

## OCR Design

Tesseract is invoked via `pytesseract` in a helper function. For PDFs, `pdf2image` converts each page to a PIL Image before Tesseract processing. The extracted text from all pages is concatenated with page-break markers.

```python
# app/ocr/engine.py

import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image

SUPPORTED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg"}
SUPPORTED_PDF_TYPE = "application/pdf"

async def extract_text(file_bytes: bytes, content_type: str) -> str:
    if content_type == SUPPORTED_PDF_TYPE:
        images = convert_from_bytes(file_bytes)
        pages = [pytesseract.image_to_string(img, lang="eng") for img in images]
        return "\n\n--- PAGE BREAK ---\n\n".join(pages)
    elif content_type in SUPPORTED_IMAGE_TYPES:
        img = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(img, lang="eng")
    else:
        raise ValueError(f"Unsupported content type: {content_type}")
```

---

## Error Handling

### Backend

| Scenario | HTTP Status | Response Body |
|---|---|---|
| Invalid JWT / expired | 401 | `{"detail": "Token invalid or expired"}` |
| Wrong credentials | 401 | `{"detail": "Invalid email or password"}` |
| Email already registered | 409 | `{"detail": "Email already registered"}` |
| File too large (> 10 MB) | 413 | `{"detail": "File size exceeds 10 MB limit"}` |
| Unsupported file format | 400 | `{"detail": "Unsupported file format. Accepted: PDF, PNG, JPG, JPEG"}` |
| Text exceeds 10,000 chars | 422 | `{"detail": "Text input exceeds 10,000 character limit"}` |
| OCR / Agent timeout | 504 | `{"detail": "Workflow execution timed out"}` |
| Supabase "relation does not exist" | 503 | `{"detail": "database_not_initialised"}` |
| GPT API error | 502 | `{"detail": "Upstream AI service error"}` |

### Frontend

- HTTP 401 → clear token → redirect to `/login`
- `detail: "database_not_initialised"` → show `AdminBanner` component
- GPT / timeout errors → toast notification with retry button
- File validation (size, type) → client-side validation before upload to avoid unnecessary round trips

---

## Database Initialisation and Reset Resilience

All tables are defined in `app/db/migrations.py` as `CREATE TABLE IF NOT EXISTS` SQL strings. The `/api/admin/init-db` endpoint executes them in dependency order (users → workflow_runs → crm_leads → support_tickets → invoice_records). Calling it multiple times is safe (idempotent).

The frontend `AdminBanner` component listens for any API response with `detail: "database_not_initialised"` via a global SWR response interceptor. When detected, it renders a banner above the page header with a "Reinitialise Database" button that calls `POST /api/admin/init-db` and then triggers a full data refresh.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection:**
Before listing properties, redundant ones have been eliminated:
- Auth registration/login properties (1.1, 1.2) are combined into a single round-trip property.
- Input validation properties for file upload (2.2, 9.1) are identical — consolidated into one.
- Intent label invariant (2.3) and routing invariant (2.7, 11.1, 11.5) are consolidated — label membership is checked once; routing correctness is a separate property.
- Confidence score range (2.4) stands alone.
- Sales agent output fields (3.1, 3.2, 3.3, 3.4, 3.6) are consolidated into one comprehensive Sales Agent output property.
- Support ticket fields (4.1, 4.2, 4.3, 4.4) consolidated — field completeness is one property; escalation is a separate property.
- Invoice extraction (5.2, 5.3, 5.5) consolidated — required fields, null handling, and response return are one comprehensive property.
- Executive summary (6.2, 6.3) consolidated — word limit and recommendation count are one property.
- /api/process response contract (11.3) and context propagation (11.5) consolidated.
- init-db idempotency (12.2) stands alone.

---

### Property 1: Auth Registration/Login Round Trip

*For any* valid email address and password of at least 8 characters, registering with those credentials and then logging in with the same credentials should each return a decodable HS256 JWT whose `sub` claim contains the user's ID and whose `email` claim matches the registered email.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Invalid Credentials Rejected

*For any* (email, password) pair where either the email is not present in the `users` table or the password does not match the stored bcrypt hash, the login endpoint SHALL return HTTP 401.

**Validates: Requirements 1.3**

---

### Property 3: Invalid JWT Rejected on Protected Endpoints

*For any* string that is not a valid, unexpired JWT signed with the server's `JWT_SECRET`, calling any protected endpoint with that string in the `Authorization` header SHALL return HTTP 401.

**Validates: Requirements 1.5**

---

### Property 4: Text Input Boundary Validation

*For any* string of length 0 to 10,000 characters (inclusive), submission to the inbox SHALL be accepted; for any string whose length exceeds 10,000 characters, submission SHALL be rejected with HTTP 422.

**Validates: Requirements 2.1**

---

### Property 5: File Upload Validation

*For any* file whose MIME type is one of `application/pdf`, `image/png`, `image/jpeg` and whose size is ≤ 10 MB, the upload endpoint SHALL accept it; for any file whose MIME type is not in that set, the endpoint SHALL return HTTP 400; for any file whose size exceeds 10 MB, the endpoint SHALL return HTTP 413.

**Validates: Requirements 2.2, 9.1, 9.4**

---

### Property 6: Intent Label Membership Invariant

*For any* valid text or file input processed by the Intent Detector, the returned `label` value SHALL be one of: `sales_inquiry`, `support_complaint`, `support_faq`, `invoice`, `contract`, `general`.

**Validates: Requirements 2.3**

---

### Property 7: Confidence Score Range Invariant

*For any* valid input processed by the Intent Detector, the returned `confidence` value SHALL satisfy `0.0 ≤ confidence ≤ 1.0`.

**Validates: Requirements 2.4**

---

### Property 8: Agent Routing Correctness

*For any* intent label in the valid set, the Agent Router SHALL dispatch to exactly the agent defined by the mapping: `sales_inquiry` → Sales Agent; `support_complaint` | `support_faq` → Support Agent; `invoice` → Finance Agent; `general` | `contract` → Executive Agent. No label SHALL be dispatched to an unintended agent, and the full item context (raw text, OCR text if present, metadata) SHALL be present in the dispatched agent's input state.

**Validates: Requirements 2.7, 11.1, 11.5**

---

### Property 9: Sales Agent Output Completeness

*For any* `sales_inquiry` input, the Sales Agent SHALL produce an output where: (a) the Quotation contains at least one item description with a unit price and a numeric total; (b) the CRM Lead record stored in Supabase contains sender name, company, contact email, inquiry summary, and status `new`; (c) the draft reply email references the sender; (d) the meeting suggestion contains both an agenda and a suggested time slot; (e) the Quotation and reply are persisted in Supabase linked to the CRM Lead record by foreign key.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**

---

### Property 10: Support Ticket Completeness and Escalation

*For any* `support_complaint` or `support_faq` input, the Support Agent SHALL create a Ticket record in Supabase containing all required fields with an initial status of `open`. *For any* `support_complaint` input whose text contains at least one of the keywords `legal`, `lawsuit`, `urgent`, or `fraud`, the Ticket status SHALL be `escalated` and the response payload SHALL include an escalation flag. *For any* `support_complaint`, the generated summary SHALL contain no more than 150 words. *For any* `support_faq` input, the draft FAQ answer SHALL be non-empty.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

---

### Property 11: Invoice Extraction and Persistence

*For any* invoice document (image or PDF), the Finance Agent SHALL return a response payload containing an Invoice Record where: all extracted fields correspond to the content of the source document; if `vendor_name` or `total_amount_due` cannot be extracted, those fields are `null` and `partial_warning` is `true`; and the Invoice Record is persisted in Supabase with a foreign key to the `workflow_run`.

**Validates: Requirements 5.2, 5.3, 5.5**

---

### Property 12: Executive Summary Bounds

*For any* data set returned from Supabase for the current day, the Executive Agent's summary SHALL contain no more than 300 words, and the recommendations list SHALL contain no fewer than 3 items.

**Validates: Requirements 6.2, 6.3**

---

### Property 13: Dashboard Recent Activity Truncation

*For any* number of processed workflow items greater than 10, the Recent Activity feed returned by `GET /api/dashboard/activity` SHALL contain exactly 10 items ordered by `created_at` descending.

**Validates: Requirements 8.3**

---

### Property 14: /api/process Response Contract

*For any* valid item payload submitted to `POST /api/inbox/submit`, the response SHALL include both a non-empty `steps_completed` list and a non-empty `output` object, regardless of which agent handled the item.

**Validates: Requirements 11.3**

---

### Property 15: init-db Idempotency

*For any* number of sequential calls ≥ 1 to `POST /api/admin/init-db` with a valid JWT, each call SHALL return a 2xx response and the database SHALL contain all required tables after each call — whether or not the tables already existed before that call.

**Validates: Requirements 12.1, 12.2**


---

## Components and Interfaces

### Backend Component Interfaces

#### `IntentDetector`
```python
class IntentDetector:
    async def classify(self, text: str) -> IntentResult:
        """
        Calls GPT-4o with a structured prompt to classify `text`
        into one of the six intent labels and produce a confidence score.
        Returns IntentResult(label, confidence).
        """
```

#### `AgentRouter`
```python
class AgentRouter:
    async def dispatch(self, state: AgentState) -> WorkflowResult:
        """
        Builds the top-level LangGraph StateGraph, compiles it,
        invokes it with `state`, and returns the WorkflowResult
        populated by the selected agent.
        """
```

#### `SalesAgent`
```python
class SalesAgent:
    graph: CompiledStateGraph  # LangGraph StateGraph

    async def run(self, state: AgentState) -> AgentState:
        """
        Executes: extract_sender_info → generate_quotation →
        draft_reply_email → generate_meeting_suggestion →
        persist_to_supabase.
        Appends each step name to state['steps_completed'].
        """
```

#### `SupportAgent`
```python
class SupportAgent:
    graph: CompiledStateGraph

    async def run(self, state: AgentState) -> AgentState:
        """
        Executes: extract_sender_info → classify_severity →
        generate_summary_or_faq → persist_ticket.
        """
```

#### `FinanceAgent`
```python
class FinanceAgent:
    graph: CompiledStateGraph

    async def run(self, state: AgentState) -> AgentState:
        """
        Executes: ocr_extract (if file) → parse_invoice_fields →
        validate_required_fields → persist_invoice_record.
        """
```

#### `ExecutiveAgent`
```python
class ExecutiveAgent:
    graph: CompiledStateGraph

    async def run(self, state: AgentState) -> AgentState:
        """
        Executes: query_supabase → generate_summary →
        generate_recommendations.
        """
```

#### `OCREngine`
```python
class OCREngine:
    async def extract_text(self, file_bytes: bytes, content_type: str) -> str:
        """
        Dispatches to Tesseract via pytesseract for images,
        or pdf2image + pytesseract for PDFs.
        Raises ValueError for unsupported content types.
        """
```

#### `SupabaseClient`
```python
class SupabaseClient:
    async def execute(self, sql: str, params: dict = {}) -> list[dict]: ...
    async def insert(self, table: str, row: dict) -> dict: ...
    async def select(self, table: str, filters: dict = {}) -> list[dict]: ...
```

### Frontend Component Interfaces

#### `AuthContext`
```typescript
interface AuthContextValue {
  token: string | null;
  userId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

#### `WorkflowViewer`
```typescript
interface WorkflowViewerProps {
  runId: string;          // polled to drive node statuses
  onComplete?: () => void;
}
```

#### `DashboardMetrics`
```typescript
interface DashboardMetrics {
  todayRequests: number;
  completedWorkflows: number;
  pendingWorkflows: number;
  totalRevenue: number;
  openTickets: number;
}
```

#### `ActivityItem`
```typescript
interface ActivityItem {
  id: string;
  timestamp: string;
  intentLabel: string;
  agent: string;
  status: string;
}
```

#### `AnalyticsMetrics`
```typescript
interface AnalyticsMetrics {
  requestsByHour: { hour: number; count: number }[];
  salesVsSupport: { date: string; sales: number; support: number }[];
  pendingByAgent: { agent: string; count: number }[];
  workflowsByAgent: { agent: string; count: number }[];
}
```

#### `AdminBanner`
```typescript
interface AdminBannerProps {
  visible: boolean;
  onReinitialise: () => Promise<void>;
}
```

---

## Testing Strategy

### Unit Tests (example-based)

- **Auth Service**: register with valid data returns decodable JWT; login with wrong password returns 401; protected endpoint rejects malformed token.
- **Intent Detector**: mock GPT response returns expected `IntentResult` shape.
- **OCR Engine**: known PNG fixture returns non-empty extracted string; unsupported MIME raises `ValueError`.
- **Agent Outputs**: each agent's Pydantic output model validates correctly structured dicts and rejects malformed ones.
- **WorkflowViewer**: renders all 7 nodes; applies `active` class to the correct node when `steps_completed` changes.
- **AdminBanner**: shows when `visible=true`; calls `onReinitialise` when button clicked.
- **Dashboard zero state**: all metrics render as `0` and Recent Activity is empty with no error thrown when API returns empty arrays.

### Property-Based Tests

Property tests are written using **Hypothesis** (Python) for backend logic and **fast-check** (TypeScript) for frontend logic. Each test runs a minimum of 100 iterations.

- **Property 1** — Auth round trip: `st.emails()` × `st.text(min_size=8)` → register then login; verify JWT claims.
- **Property 2** — Invalid credentials: generate random strings not in `users` table → assert HTTP 401.
- **Property 3** — JWT rejection: generate random base64 strings and structurally invalid JWTs → assert protected endpoint returns 401.
- **Property 4** — Text length boundary: `st.text(max_size=15_000)` → assert accept iff length ≤ 10,000.
- **Property 5** — File upload validation: generate (MIME type, size) pairs → assert accept/reject per rule.
- **Property 6** — Intent label membership: mock GPT with random label from full label space → assert output label is always in `VALID_LABELS`.
- **Property 7** — Confidence score range: mock GPT with random float → assert `0.0 ≤ score ≤ 1.0` enforced by validator.
- **Property 8** — Routing correctness: generate random valid `intent_label` → assert routed agent matches mapping.
- **Property 9** — Sales output completeness: generate random inquiry texts → mock GPT; assert all 5 sub-conditions on output.
- **Property 10** — Support ticket completeness and escalation: generate random complaint/faq texts with/without escalation keywords → assert ticket fields and escalation logic.
- **Property 11** — Invoice extraction: use fixture invoices with known fields; vary which required fields are absent → assert null handling and `partial_warning` flag.
- **Property 12** — Executive summary bounds: generate random day-data dicts → mock GPT; assert word count ≤ 300 and len(recommendations) ≥ 3.
- **Property 13** — Recent activity truncation: generate 0–50 workflow run records → assert API returns exactly min(n, 10) most recent.
- **Property 14** — /api/process contract: generate valid item payloads across all intent labels → assert response always contains `steps_completed` (non-empty list) and `output` (non-empty dict).
- **Property 15** — init-db idempotency: call endpoint 1–5 times in sequence → assert 2xx each time and all tables exist.

### Integration Tests (1–3 examples each)

- End-to-end submission with a real text fixture routed to each of the four agents.
- Dashboard metrics endpoint reflects counts after known DB inserts.
- Analytics endpoint returns correctly shaped data.
- OCR pipeline with a real invoice image fixture.

### Edge Case Tests

- Confidence score < 0.5 triggers manual-selection UI in the AI Inbox.
- WorkflowViewer halts animation and shows error indicator when a step fails.
- Dashboard renders zero values after a simulated DB reset.
- Analytics charts display "No data available" label when data arrays are empty.
- Frontend redirects to `/login` when an expired JWT is detected.
- AdminBanner appears when the backend returns `detail: "database_not_initialised"`.
