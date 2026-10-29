from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import CartItem, WishlistItem
from app.routers.cart import router as cart_router
from app.routers.cart import wishlist_router


@asynccontextmanager
async def lifespan(app: FastAPI):

    Base.metadata.create_all(
        bind=engine,
    )

    yield


app = FastAPI(
    title="Inventory Order Management - Cart Service",
    version="1.0.0",
    description="Shopping cart and wishlist microservice",
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


app.include_router(cart_router)
app.include_router(wishlist_router)


@app.get("/")
def root():

    return {
        "service": "cart-service",
        "status": "running",
    }


@app.get("/health")
def health():

    return {
        "service": "cart-service",
        "status": "healthy",
    }
