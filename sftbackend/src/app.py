from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from src.handlers import users, scrapped, ai_customs, database, login, logout, admin, chat

app = FastAPI()

# Public routes
app.include_router(users.public_router, prefix="/users", tags=["Users"])

# Routes requiring authentication
app.include_router(users.auth_router, prefix="/users", tags=["Users"])
app.include_router(scrapped.router, tags=["Scrape"])
app.include_router(ai_customs.router, tags=["Customs"])
app.include_router(database.router, tags=["Database"])
app.include_router(login.router, tags=["Login"])
app.include_router(logout.router, tags=["Logout"])
app.include_router(admin.router, tags=["Admin"], include_in_schema=False)
app.include_router(chat.router, tags=["Chat"])

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return JSONResponse(headers={"Access-Control-Allow-Origin": "*"}, content={})
