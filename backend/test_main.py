import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db

# A separate, throwaway SQLite database just for tests
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Replace the real database dependency with the test one
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_teardown():
    Base.metadata.create_all(bind=engine)   # build fresh tables before each test
    yield
    Base.metadata.drop_all(bind=engine)     # wipe them after each test

def test_create_category():
    response = client.post("/categories", json={"name": "Drinks"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Drinks"
    assert "id" in data


def test_create_duplicate_category_fails():
    client.post("/categories", json={"name": "Drinks"})
    response = client.post("/categories", json={"name": "Drinks"})
    assert response.status_code == 400


def test_create_product():
    category = client.post("/categories", json={"name": "Drinks"}).json()
    response = client.post("/products", json={
        "name": "Fura", "price": 500, "stock": 20, "category_id": category["id"]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["stock"] == 20


def test_order_deducts_stock():
    category = client.post("/categories", json={"name": "Drinks"}).json()
    product = client.post("/products", json={
        "name": "Fura", "price": 500, "stock": 20, "category_id": category["id"]
    }).json()
    customer = client.post("/customers", json={"name": "Halima"}).json()

    response = client.post("/orders", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 2}]
    })
    assert response.status_code == 200
    assert response.json()["total"] == 1000

    updated_product = client.get(f"/products/{product['id']}").json()
    assert updated_product["stock"] == 18


def test_order_fails_with_insufficient_stock():
    category = client.post("/categories", json={"name": "Drinks"}).json()
    product = client.post("/products", json={
        "name": "Fura", "price": 500, "stock": 5, "category_id": category["id"]
    }).json()
    customer = client.post("/customers", json={"name": "Halima"}).json()

    response = client.post("/orders", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 50}]
    })
    assert response.status_code == 400

    unchanged_product = client.get(f"/products/{product['id']}").json()
    assert unchanged_product["stock"] == 5  # confirms nothing was deducted on failure


def test_cancel_order_restores_stock():
    category = client.post("/categories", json={"name": "Drinks"}).json()
    product = client.post("/products", json={
        "name": "Fura", "price": 500, "stock": 20, "category_id": category["id"]
    }).json()
    customer = client.post("/customers", json={"name": "Halima"}).json()

    order = client.post("/orders", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 2}]
    }).json()

    cancel_response = client.put(f"/orders/{order['id']}/cancel")
    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "cancelled"

    restored_product = client.get(f"/products/{product['id']}").json()
    assert restored_product["stock"] == 20


def test_cannot_cancel_twice():
    category = client.post("/categories", json={"name": "Drinks"}).json()
    product = client.post("/products", json={
        "name": "Fura", "price": 500, "stock": 20, "category_id": category["id"]
    }).json()
    customer = client.post("/customers", json={"name": "Halima"}).json()
    order = client.post("/orders", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 2}]
    }).json()

    client.put(f"/orders/{order['id']}/cancel")
    second_cancel = client.put(f"/orders/{order['id']}/cancel")
    assert second_cancel.status_code == 400