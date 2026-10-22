from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import transactions, users
from .routers import auth

app = FastAPI()
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
async def main():
    return {"message": "Hello World!!"}

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(transactions.router)
