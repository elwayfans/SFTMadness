from fastapi import FastAPI
from routes import customize

app = FastAPI()
app.include_router(customize.router)
