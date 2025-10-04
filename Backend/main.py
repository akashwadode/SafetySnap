from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
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
model = YOLO("yolov8n.pt")  # You can replace with your trained model path

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
    if not (file.content_type.startswith("image/") or file.content_type.startswith("video/")):
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG/PNG or MP4/AVI.")

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)

    file_extension = file.filename.split(".")[-1]
    temp_filename = f"{uuid.uuid4()}.{file_extension}"
    temp_path = os.path.join(temp_dir, temp_filename)

    with open(temp_path, "wb") as f:
        f.write(await file.read())

    result_image_base64 = None

    try:
        detections = []

        # Image Processing
        if file.content_type.startswith("image/"):
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

        # Placeholder for video support
        else:
            detections = [{
                "label": "video_processing",
                "confidence": 0.0,
                "bbox": [0, 0, 0, 0]
            }]

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
            "result_image_base64": result_image_base64 if file.content_type.startswith("image/") else None
        }

        return response

    finally:
        # Cleanup temporary files
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if 'result_path' in locals() and os.path.exists(result_path):
            os.remove(result_path)

# ---------------------------------------------------------
# ROOT TEST ROUTE
# ---------------------------------------------------------
@app.get("/")
def root():
    return {"message": "The Guardian Eye backend is running!"}