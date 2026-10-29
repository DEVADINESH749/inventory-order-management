from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers.notifications import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Inventory Order Management - Notification Service",
    version="1.0.0",
    description="Notification microservice",
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

app.include_router(notifications_router)


@app.get("/")
def root():
    return {
        "service": "notification-service",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "service": "notification-service",
        "status": "healthy",
    }
