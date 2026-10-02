from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    price: float
    stock: int = 0
    category_id: int

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int

    class Config:
        from_attributes = True

from typing import List


class CustomerBase(BaseModel):
    name: str
    phone: str | None = None
    address: str | None = None

class CustomerCreate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int

    class Config:
        from_attributes = True


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate]

class OrderOut(BaseModel):
    id: int
    customer_id: int
    status: str
    total: float
    items: List[OrderItemOut]

    class Config:
        from_attributes = True