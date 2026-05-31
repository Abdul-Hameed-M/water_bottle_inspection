import sys
import os
import platform

os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
# Intel Mac: never route inference through broken/slow hybrid MPS
if platform.system() == "Darwin" and platform.machine() != "arm64":
    os.environ["PYTORCH_MPS_HIGH_WATERMARK_RATIO"] = "0.0"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.database.models import init_db
from backend.routes import auth, stream, upload, analytics

app = FastAPI(
    title="SeeWise AI Industrial Bottle Inspection Platform",
    description="Real-time object detection and inspection system backend",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to react app domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables and pre-populate defaults
@app.on_event("startup")
def startup_event():
    print("[SeeWise Backend] Initializing database...")
    init_db()
    print("[SeeWise Backend] Database initialized successfully.")

# Mount static folder to serve screenshots of failed bottles
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BACKEND_DIR, "storage", "failed_bottles")
os.makedirs(STORAGE_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=BACKEND_DIR), name="static")

# Register routes
app.include_router(auth.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "company": "SeeWise",
        "system": "Industrial Water Bottle Inspection Platform",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
