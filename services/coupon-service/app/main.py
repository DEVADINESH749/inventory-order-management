from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers.coupons import router as coupons_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Inventory Order Management - Coupon Service",
    version="1.0.0",
    description="Coupon and discount microservice",
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

app.include_router(coupons_router)


@app.get("/")
def root():
    return {
        "service": "coupon-service",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "service": "coupon-service",
        "status": "healthy",
    }
