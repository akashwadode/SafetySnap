from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, auth
from database import init_db, get_db
from datetime import datetime
import json
import os
import cv2
from ultralytics import YOLO
import uuid
import base64

# ---------------------------------------------------------
# APP INITIALIZATION
# ---------------------------------------------------------
app = FastAPI(title="The Guardian Eye")
security = HTTPBearer()

# Enable CORS for frontend (React + Vite)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# FIREBASE INITIALIZATION
# ---------------------------------------------------------
cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(cred)

# ---------------------------------------------------------
# DATABASE INITIALIZATION
# ---------------------------------------------------------
init_db()

# ---------------------------------------------------------
# YOLO MODEL INITIALIZATION
# ---------------------------------------------------------
model = YOLO("yolov8n.pt")  # Replace with custom model path for PPE detection

# ---------------------------------------------------------
# AUTH VERIFICATION
# ---------------------------------------------------------
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ---------------------------------------------------------
# UPLOAD ENDPOINT
# ---------------------------------------------------------
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user_id: str = Depends(verify_token)):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG/PNG.")

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)

    file_extension = file.filename.split(".")[-1]
    temp_filename = f"{uuid.uuid4()}.{file_extension}"
    temp_path = os.path.join(temp_dir, temp_filename)

    with open(temp_path, "wb") as f:
        f.write(await file.read())

    result_image_base64 = None

    try:
        # Process image with YOLOv8
        detections = []
        results = model(temp_path)
        for result in results:
            for box in result.boxes:
                detections.append({
                    "label": result.names[int(box.cls)],
                    "confidence": float(box.conf),
                    "bbox": [int(coord) for coord in box.xyxy[0].tolist()]
                })

        # Save image with bounding boxes
        result_image = results[0].plot()
        result_path = os.path.join(temp_dir, f"result_{temp_filename}")
        cv2.imwrite(result_path, result_image)

        # Encode to base64
        with open(result_path, "rb") as img_file:
            result_image_base64 = base64.b64encode(img_file.read()).decode('utf-8')

        # Save metadata in SQLite
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO uploads (user_id, filename, upload_time, detection_results)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, file.filename, datetime.utcnow().isoformat(), json.dumps(detections))
            )
            conn.commit()
            upload_id = cursor.lastrowid

        # Return detection data
        response = {
            "upload_id": upload_id,
            "filename": file.filename,
            "detections": detections,
            "result_image_base64": result_image_base64
        }

        return response

    finally:
        # Cleanup temporary files
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if 'result_path' in locals() and os.path.exists(result_path):
            os.remove(result_path)

# ---------------------------------------------------------
# HISTORY ENDPOINT
# ---------------------------------------------------------
@app.get("/history")
async def get_history(
    user_id: str = Depends(verify_token),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    filename: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            query = "SELECT id, user_id, filename, upload_time, detection_results FROM uploads WHERE user_id = ?"
            params = [user_id]

            # Apply filters
            if filename:
                query += " AND filename LIKE ?"
                params.append(f"%{filename}%")
            if start_date:
                query += " AND upload_time >= ?"
                params.append(start_date)
            if end_date:
                query += " AND upload_time <= ?"
                params.append(end_date)

            # Count total records for pagination
            cursor.execute(f"SELECT COUNT(*) FROM ({query})", params)
            total_records = cursor.fetchone()[0]

            # Apply pagination
            query += " ORDER BY upload_time DESC LIMIT ? OFFSET ?"
            params.extend([per_page, (page - 1) * per_page])

            cursor.execute(query, params)
            uploads = cursor.fetchall()

            # Format response
            results = [
                {
                    "upload_id": row[0],
                    "user_id": row[1],
                    "filename": row[2],
                    "upload_time": row[3],
                    "detections": json.loads(row[4]) if row[4] else []
                }
                for row in uploads
            ]

            return {
                "uploads": results,
                "total": total_records,
                "page": page,
                "per_page": per_page,
                "total_pages": (total_records + per_page - 1) // per_page
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")

# ---------------------------------------------------------
# ROOT TEST ROUTE
# ---------------------------------------------------------
@app.get("/")
def root():
    return {"message": "The Guardian Eye backend is running!"}