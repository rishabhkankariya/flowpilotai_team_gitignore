"""
Admin API endpoints.
All routes require role='admin'.
"""
import structlog
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, status
from sqlalchemy import delete, select

from app.api.deps import DBSession, AdminUser
from app.db.models.user import User
from app.db.models.inbox import InboxSubmission, WorkflowStatus, AgentType
from app.schemas.user import UserResponse

logger = structlog.get_logger(__name__)
router = APIRouter()

# ─── Seed Data ─────────────────────────────────────────────────────────────────

SEED_SUBMISSIONS = [
    {
        "content": "Hi, we have a new enterprise lead from Acme Corp. John Smith (CTO) is interested in our platform for 500 users. Budget confirmed at $250k/year. He wants a demo next Tuesday.",
        "detected_intent": "sales_lead",
        "confidence_score": 0.92,
        "assigned_agent": AgentType.sales,
        "status": WorkflowStatus.completed,
        "result": {
            "agent_response": {
                "agent_type": "sales",
                "summary": "High-value enterprise lead from Acme Corp CTO, $250k/year budget confirmed.",
                "structured_data": {
                    "company_name": "Acme Corp",
                    "contact_name": "John Smith",
                    "urgency": "hot",
                    "lead_score": 87,
                    "deal_size_estimate": "$250,000",
                },
                "action_items": ["Schedule demo for Tuesday", "Send enterprise pricing proposal"],
                "confidence": 0.92,
            },
            "steps": [
                {"step_name": "intent_node", "status": "completed", "data": {"intent": "sales_lead"}},
                {"step_name": "confidence_node", "status": "completed", "data": {"score": 0.92}},
                {"step_name": "router_node", "status": "completed", "data": {"agent": "sales", "escalated": False}},
                {"step_name": "sales_agent_node", "status": "completed", "data": {"lead_score": 87, "urgency": "hot"}},
            ],
        },
    },
    {
        "content": "URGENT: Our login page has been returning 500 errors for the last 2 hours. All enterprise customers are affected. Error: JWT_SECRET_MISSING in logs.",
        "detected_intent": "customer_support",
        "confidence_score": 0.97,
        "assigned_agent": AgentType.support,
        "status": WorkflowStatus.completed,
        "result": {
            "agent_response": {
                "agent_type": "support",
                "summary": "Critical production outage — JWT secret missing, all enterprise logins failing.",
                "structured_data": {
                    "issue_type": "bug",
                    "severity": "critical",
                    "sla_recommendation": "1 hour",
                    "escalate_to_engineering": True,
                },
                "action_items": ["Check environment variables immediately", "Roll back recent deploy"],
                "confidence": 0.97,
            },
            "steps": [
                {"step_name": "intent_node", "status": "completed", "data": {"intent": "customer_support"}},
                {"step_name": "confidence_node", "status": "completed", "data": {"score": 0.97}},
                {"step_name": "router_node", "status": "completed", "data": {"agent": "support", "escalated": False}},
                {"step_name": "support_agent_node", "status": "completed", "data": {"severity": "critical"}},
            ],
        },
    },
    {
        "content": "Please process this invoice from TechSupplies Inc. Invoice #INV-2024-0042, $4,860.00 due Feb 14. For cloud storage services.",
        "detected_intent": "invoice_processing",
        "confidence_score": 0.89,
        "assigned_agent": AgentType.finance,
        "status": WorkflowStatus.completed,
        "result": {
            "agent_response": {
                "agent_type": "finance",
                "summary": "Invoice from TechSupplies Inc for $4,860.00 — approved for payment.",
                "structured_data": {
                    "vendor_name": "TechSupplies Inc",
                    "invoice_number": "INV-2024-0042",
                    "total_amount": 4860.00,
                    "payment_recommendation": "approve",
                    "anomalies": [],
                },
                "action_items": ["Route for CFO approval", "Schedule payment by Feb 14"],
                "confidence": 0.89,
            },
            "steps": [
                {"step_name": "intent_node", "status": "completed", "data": {"intent": "invoice_processing"}},
                {"step_name": "confidence_node", "status": "completed", "data": {"score": 0.89}},
                {"step_name": "router_node", "status": "completed", "data": {"agent": "finance"}},
                {"step_name": "finance_agent_node", "status": "completed", "data": {"total_amount": 4860.0}},
            ],
        },
    },
    {
        "content": "Q3 Board Report: Revenue $12.4M (+18% YoY). Churn 2.3%, NPS 64. Key risk: enterprise churn in APAC region. Proposed: expand CS team by 3 headcount.",
        "detected_intent": "executive_summary",
        "confidence_score": 0.94,
        "assigned_agent": AgentType.executive,
        "status": WorkflowStatus.completed,
        "result": {
            "agent_response": {
                "agent_type": "executive",
                "summary": "Strong Q3 performance with 18% revenue growth. APAC churn risk flagged.",
                "structured_data": {
                    "content_type": "kpi_review",
                    "priority": "high",
                    "key_metrics": [
                        {"metric": "Revenue", "value": "$12.4M", "context": "+18% YoY"},
                        {"metric": "Churn", "value": "2.3%", "context": "Within target"},
                    ],
                },
                "action_items": ["Approve APAC CS headcount request", "Schedule board follow-up"],
                "confidence": 0.94,
            },
            "steps": [
                {"step_name": "intent_node", "status": "completed", "data": {"intent": "executive_summary"}},
                {"step_name": "confidence_node", "status": "completed", "data": {"score": 0.94}},
                {"step_name": "router_node", "status": "completed", "data": {"agent": "executive"}},
                {"step_name": "executive_agent_node", "status": "completed", "data": {"priority": "high"}},
            ],
        },
    },
    {
        "content": "Can you help me understand what the thingy does with the data?",
        "detected_intent": "unknown",
        "confidence_score": 0.15,
        "assigned_agent": AgentType.executive,
        "status": WorkflowStatus.completed,
        "result": {
            "agent_response": {
                "agent_type": "executive",
                "summary": "Low-confidence submission escalated for manual review.",
                "structured_data": {
                    "content_type": "escalation",
                    "escalation_context": {"was_escalated": True, "recommended_handler": "manual_review"},
                },
                "action_items": ["Manual review required"],
                "confidence": 0.2,
            },
            "steps": [
                {"step_name": "intent_node", "status": "completed", "data": {"intent": "unknown"}},
                {"step_name": "confidence_node", "status": "completed", "data": {"score": 0.15}},
                {"step_name": "router_node", "status": "completed", "data": {"agent": "executive", "escalated": True}},
                {"step_name": "executive_agent_node", "status": "completed", "data": {"is_escalation": True}},
            ],
        },
    },
]


@router.post(
    "/reset-demo",
    status_code=status.HTTP_200_OK,
    summary="Reset all demo data (admin only)",
)
async def reset_demo(db: DBSession, admin: AdminUser) -> dict:
    result = await db.execute(delete(InboxSubmission))
    deleted = getattr(result, "rowcount", 0)
    await db.commit()
    logger.info("demo_reset", admin_id=str(admin.id), deleted_rows=deleted)
    return {"operation": "reset_demo", "deleted_rows": deleted}


@router.post(
    "/seed-demo",
    status_code=status.HTTP_201_CREATED,
    summary="Seed demo data (admin only)",
)
async def seed_demo(db: DBSession, admin: AdminUser) -> dict:
    submissions = []
    for seed in SEED_SUBMISSIONS:
        s = InboxSubmission(
            user_id=admin.id,
            content=seed["content"],
            detected_intent=seed["detected_intent"],
            confidence_score=seed["confidence_score"],
            assigned_agent=seed["assigned_agent"],
            status=seed["status"],
            result=seed["result"],
        )
        submissions.append(s)

    db.add_all(submissions)
    await db.commit()
    logger.info("demo_seeded", admin_id=str(admin.id), count=len(submissions))
    return {"operation": "seed_demo", "seeded_rows": len(submissions)}


@router.get(
    "/users",
    response_model=List[UserResponse],
    summary="List all users (admin only)",
)
async def list_users(db: DBSession, admin: AdminUser) -> List[UserResponse]:
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]
