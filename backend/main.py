from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Order Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TEMPORARY - we'll restrict this once we have the real frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Order Tracker API is running"}


# ---- Categories ----

@app.post("/categories", response_model=schemas.CategoryOut)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Category).filter(models.Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    db_category = models.Category(name=category.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@app.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()


@app.put("/categories/{category_id}", response_model=schemas.CategoryOut)
def update_category(category_id: int, updated: schemas.CategoryCreate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.name = updated.name
    db.commit()
    db.refresh(category)
    return category


@app.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return {"message": f"Category {category_id} deleted"}


# ---- Products ----

@app.post("/products", response_model=schemas.ProductOut)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == product.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.get("/products", response_model=list[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()


@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.put("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, updated: schemas.ProductCreate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name = updated.name
    product.price = updated.price
    product.stock = updated.stock
    product.category_id = updated.category_id

    db.commit()
    db.refresh(product)
    return product


@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": f"Product {product_id} deleted"}


# ---- Customers ----

@app.post("/customers", response_model=schemas.CustomerOut)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    db_customer = models.Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


@app.get("/customers", response_model=list[schemas.CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).all()


# ---- Orders ----

@app.post("/orders", response_model=schemas.OrderOut)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == order.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not order.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    order_items = []
    total = 0.0

    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for {product.name}. Available: {product.stock}"
            )
        order_items.append((product, item.quantity))
        total += product.price * item.quantity

    db_order = models.Order(customer_id=order.customer_id, status="pending", total=total)
    db.add(db_order)
    db.flush()  # assigns db_order.id without fully committing yet

    for product, quantity in order_items:
        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=product.price,
        )
        db.add(db_item)
        product.stock -= quantity

    db.commit()
    db.refresh(db_order)
    return db_order


@app.get("/orders", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).all()


@app.get("/orders/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.put("/orders/{order_id}/cancel", response_model=schemas.OrderOut)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == "delivered":
        raise HTTPException(status_code=400, detail="Cannot cancel a delivered order")
    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Order is already cancelled")

    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity

    order.status = "cancelled"
    db.commit()
    db.refresh(order)
    return order


@app.put("/orders/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    valid_statuses = ["pending", "paid", "delivered"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot change status of a cancelled order")

    order.status = status
    db.commit()
    db.refresh(order)
    return order

from datetime import datetime, timezone
from sqlalchemy import func


@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    today = datetime.now(timezone.utc).date()

    # Today's sales: sum of totals for non-cancelled orders created today
    todays_orders = (
        db.query(models.Order)
        .filter(func.date(models.Order.created_at) == today)
        .filter(models.Order.status != "cancelled")
        .all()
    )
    todays_sales = sum(order.total for order in todays_orders)
    todays_order_count = len(todays_orders)

    # Low stock: products with stock below threshold
    LOW_STOCK_THRESHOLD = 5
    low_stock_products = (
        db.query(models.Product)
        .filter(models.Product.stock < LOW_STOCK_THRESHOLD)
        .all()
    )

    # Top-selling products: group order items by product, sum quantity
    top_products_query = (
        db.query(
            models.Product.id,
            models.Product.name,
            func.sum(models.OrderItem.quantity).label("total_sold")
        )
        .join(models.OrderItem, models.OrderItem.product_id == models.Product.id)
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(models.Order.status != "cancelled")
        .group_by(models.Product.id)
        .order_by(func.sum(models.OrderItem.quantity).desc())
        .limit(5)
        .all()
    )

    return {
        "todays_sales": todays_sales,
        "todays_order_count": todays_order_count,
        "low_stock_products": [
            {"id": p.id, "name": p.name, "stock": p.stock} for p in low_stock_products
        ],
        "top_products": [
            {"id": row.id, "name": row.name, "total_sold": row.total_sold}
            for row in top_products_query
        ],
    }