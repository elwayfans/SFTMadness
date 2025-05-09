from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

# Example route 1
@app.get("/health")
def health_check():
    return {"status": "ok"}

# Example route 2
@app.post("/process")
def process_data(payload: dict):
    # You can validate keys in payload here
    return {"received": payload}

# Handle undefined routes (404)
@app.middleware("http")
async def catch_not_found(request: Request, call_next):
    try:
        response = await call_next(request)
        if response.status_code == 404:
            return JSONResponse(
                status_code=404,
                content={"detail": "Route not found"},
            )
        return response
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error": str(e)},
        )

# Optional: Custom exception handler (for 422, etc.)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
