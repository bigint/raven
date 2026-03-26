import enum
from datetime import datetime
from decimal import Decimal

from cuid2 import cuid_wrapper
from sqlalchemy import DateTime, Enum, Index, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class BudgetEntityType(str, enum.Enum):
    GLOBAL = "global"
    KEY = "key"


class BudgetPeriod(str, enum.Enum):
    DAILY = "daily"
    MONTHLY = "monthly"


budget_entity_type_enum = Enum(
    BudgetEntityType,
    name="budget_entity_type",
    values_callable=lambda e: [m.value for m in e],
    create_constraint=False,
    native_enum=True,
    schema=None,
)

budget_period_enum = Enum(
    BudgetPeriod,
    name="budget_period",
    values_callable=lambda e: [m.value for m in e],
    create_constraint=False,
    native_enum=True,
    schema=None,
)


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (Index("budgets_entity_idx", "entityType", "entityId"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper)
    entity_type: Mapped[BudgetEntityType] = mapped_column(
        "entityType", budget_entity_type_enum, nullable=False
    )
    entity_id: Mapped[str] = mapped_column("entityId", Text, nullable=False)
    limit_amount: Mapped[Decimal] = mapped_column(
        "limitAmount", Numeric(precision=12, scale=2), nullable=False
    )
    period: Mapped[BudgetPeriod] = mapped_column(
        budget_period_enum, nullable=False, default=BudgetPeriod.MONTHLY
    )
    alert_threshold: Mapped[Decimal] = mapped_column(
        "alertThreshold",
        Numeric(precision=5, scale=2),
        nullable=False,
        default=Decimal("0.80"),
    )
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )
