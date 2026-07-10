"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _is_sqlite() -> bool:
    bind = op.get_bind()
    return bind.dialect.name == "sqlite"


def upgrade() -> None:
    dialect = op.get_bind().dialect.name

    # ── Enums (PostgreSQL only — SQLite uses VARCHAR) ─────────────────────────
    if dialect == "postgresql":
        op.execute("CREATE TYPE user_role AS ENUM ('admin', 'user')")
        op.execute(
            "CREATE TYPE agent_type AS ENUM ('sales', 'support', 'finance', 'executive')"
        )
        op.execute(
            "CREATE TYPE workflow_status AS ENUM ('pending', 'processing', 'completed', 'failed')"
        )

    # ── Shared column helpers ─────────────────────────────────────────────────
    if dialect == "postgresql":
        from sqlalchemy.dialects import postgresql
        id_col = sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        )
        user_id_col = sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False)
        role_col = sa.Column(
            "role",
            sa.Enum("admin", "user", name="user_role", create_type=False),
            nullable=False,
            server_default="user",
        )
        is_active_col = sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default="true"
        )
        created_at_col = sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        )
        updated_at_col = sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        )
        agent_col = sa.Column(
            "assigned_agent",
            sa.Enum(
                "sales", "support", "finance", "executive",
                name="agent_type",
                create_type=False,
            ),
            nullable=True,
        )
        status_col = sa.Column(
            "status",
            sa.Enum(
                "pending", "processing", "completed", "failed",
                name="workflow_status",
                create_type=False,
            ),
            nullable=False,
            server_default="pending",
        )
        result_col = sa.Column(
            "result", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        )
    else:
        # SQLite-compatible equivalents
        id_col = sa.Column("id", sa.String(36), nullable=False)
        user_id_col = sa.Column("user_id", sa.String(36), nullable=False)
        role_col = sa.Column(
            "role", sa.String(20), nullable=False, server_default="user"
        )
        is_active_col = sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default="1"
        )
        created_at_col = sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(datetime('now'))"),
            nullable=False,
        )
        updated_at_col = sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(datetime('now'))"),
            nullable=False,
        )
        agent_col = sa.Column("assigned_agent", sa.String(50), nullable=True)
        status_col = sa.Column(
            "status", sa.String(20), nullable=False, server_default="pending"
        )
        result_col = sa.Column("result", sa.JSON(), nullable=True)

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        id_col,
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        role_col,
        is_active_col,
        created_at_col,
        updated_at_col,
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── inbox_submissions ─────────────────────────────────────────────────────
    op.create_table(
        "inbox_submissions",
        id_col.copy(),
        user_id_col,
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("file_url", sa.String(2048), nullable=True),
        sa.Column("detected_intent", sa.String(255), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        agent_col,
        status_col,
        result_col,
        sa.Column("error_message", sa.Text(), nullable=True),
        created_at_col.copy(),
        updated_at_col.copy(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inbox_submissions_user_id", "inbox_submissions", ["user_id"])
    op.create_index("ix_inbox_submissions_status", "inbox_submissions", ["status"])
    op.create_index(
        "ix_inbox_submissions_created_at", "inbox_submissions", ["created_at"]
    )

    # ── updated_at triggers (PostgreSQL only) ─────────────────────────────────
    if dialect == "postgresql":
        op.execute("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = now();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """)
        for table in ("users", "inbox_submissions"):
            op.execute(f"""
                CREATE TRIGGER update_{table}_updated_at
                BEFORE UPDATE ON {table}
                FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
            """)


def downgrade() -> None:
    dialect = op.get_bind().dialect.name

    if dialect == "postgresql":
        for table in ("users", "inbox_submissions"):
            op.execute(f"DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table}")
        op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")

    op.drop_table("inbox_submissions")
    op.drop_table("users")

    if dialect == "postgresql":
        op.execute("DROP TYPE IF EXISTS workflow_status")
        op.execute("DROP TYPE IF EXISTS agent_type")
        op.execute("DROP TYPE IF EXISTS user_role")
