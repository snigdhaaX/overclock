from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class CarrierEventIn(BaseModel):
    source: str = Field(min_length=2, max_length=100)
    event_id: str = Field(min_length=1, max_length=160)
    shipment_id: int
    event_type: str = "DELAY"
    delay_days: int = Field(default=0, ge=0, le=365)
    sequence_no: int = Field(ge=1)


class RecoveryPlanIn(BaseModel):
    order_id: int
    action: str = Field(pattern="^(stock_reallocation|freight_expedite|alternative_supplier|order_split)$")
    description: str = Field(min_length=8, max_length=2000)


class ApprovalIn(BaseModel):
    expected_version: int = Field(ge=1)
    comment: str | None = Field(default=None, max_length=1000)


class RecoveryPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_id: int
    action: str
    description: str
    status: str
    version: int
    created_by: str
    approved_by: str | None
    created_at: datetime
