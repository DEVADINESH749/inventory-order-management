from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.models import User
from app.routers.auth import router as auth_router
from app.security import hash_password


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        admin = (
            db.query(User)
            .filter(User.email == "admin@inventory.com")
            .first()
        )

        if not admin:
            admin = User(
                name="System Admin",
                email="admin@inventory.com",
                password_hash=hash_password("Admin@12345"),
                role="admin",
                is_active=True,
            )
            db.add(admin)

        inventory_manager = (
            db.query(User)
            .filter(User.email == "inventory@inventory.com")
            .first()
        )

        if not inventory_manager:
            inventory_manager = User(
                name="Inventory Manager",
                email="inventory@inventory.com",
                password_hash=hash_password("Inventory@12345"),
                role="inventory_manager",
                is_active=True,
            )
            db.add(inventory_manager)

        db.commit()

    finally:
        db.close()

    yield


app = FastAPI(
    title="Inventory Order Management - Auth Service",
    version="1.0.0",
    description="Authentication, JWT and RBAC microservice",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "service": "auth-service",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "service": "auth-service",
        "status": "healthy",
    }
