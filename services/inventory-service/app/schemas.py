from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InventoryCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)


class InventoryUpdate(BaseModel):
    quantity: int = Field(ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)


class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    reserved_quantity: int
    available_quantity: int
    low_stock_threshold: int
    updated_at: datetime


class StockOperationRequest(BaseModel):
    quantity: int = Field(gt=0)


class StockOperationResponse(BaseModel):
    message: str
    inventory: InventoryResponse
