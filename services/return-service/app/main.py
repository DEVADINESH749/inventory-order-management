from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers.returns import router as returns_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Inventory Order Management - Return & Refund Service",
    version="1.0.0",
    description="Return request and refund tracking microservice",
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

app.include_router(returns_router)


@app.get("/")
def root():
    return {
        "service": "return-service",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "service": "return-service",
        "status": "healthy",
    }
