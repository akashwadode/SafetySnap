from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
from database import init_db, get_db
from datetime import datetime
import json

app = FastAPI(title="The Guardian Eye")
security = HTTPBearer()

# Initialize Firebase Admin
cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(cred)

# Initialize SQLite
init_db()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user_id: str = Depends(verify_token)):
    if not (file.content_type.startswith("image/") or file.content_type.startswith("video/")):
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG/PNG or MP4/AVI.")
    
    # Save file metadata to SQLite
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO uploads (user_id, filename, upload_time, detection_results) VALUES (?, ?, ?, ?)",
            (user_id, file.filename, datetime.utcnow().isoformat(), json.dumps({"status": "pending"}))
        )
        conn.commit()
        upload_id = cursor.lastrowid
    
    # Mock detection results (replace with YOLOv8 later)
    mock_results = {
        "upload_id": upload_id,
        "filename": file.filename,
        "detections": [
            {"label": "helmet", "confidence": 0.95, "bbox": [100, 100, 200, 200]},
            {"label": "vest", "confidence": 0.90, "bbox": [150, 300, 250, 400]}
        ]
    }
    
    # Update detection results in database
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE uploads SET detection_results = ? WHERE id = ?",
            (json.dumps(mock_results), upload_id)
        )
        conn.commit()
    
    return mock_results