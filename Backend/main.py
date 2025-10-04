from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
from database import init_db, get_db
from datetime import datetime
import json
import os
import cv2
from ultralytics import YOLO
import uuid

app = FastAPI(title="The Guardian Eye")
security = HTTPBearer()

# Initialize Firebase Admin
cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(cred)

# Initialize SQLite
init_db()

# Load YOLOv8 model
model = YOLO("yolov8n.pt")  # Pre-trained model (replace with custom model if trained)

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

    # Save file temporarily
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_extension = file.filename.split('.')[-1]
    temp_filename = f"{uuid.uuid4()}.{file_extension}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    try:
        # Process image with YOLOv8
        if file.content_type.startswith("image/"):
            results = model(temp_path)
            detections = []
            for result in results:
                for box in result.boxes:
                    detections.append({
                        "label": result.names[int(box.cls)],
                        "confidence": float(box.conf),
                        "bbox": [int(coord) for coord in box.xyxy[0].tolist()]  # [x_min, y_min, x_max, y_max]
                    })

            # Save file with bounding boxes (optional, for frontend display)
            result_image = results[0].plot()  # Draw bounding boxes
            result_path = os.path.join(temp_dir, f"result_{temp_filename}")
            cv2.imwrite(result_path, result_image)

        else:
            # Video processing placeholder (frame-by-frame, to be implemented)
            detections = [{"label": "video_processing", "confidence": 0.0, "bbox": [0, 0, 0, 0]}]
            result_path = temp_path

        # Save metadata to SQLite
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO uploads (user_id, filename, upload_time, detection_results) VALUES (?, ?, ?, ?)",
                (user_id, file.filename, datetime.utcnow().isoformat(), json.dumps(detections))
            )
            conn.commit()
            upload_id = cursor.lastrowid

        # Prepare response
        response = {
            "upload_id": upload_id,
            "filename": file.filename,
            "detections": detections,
            "result_image_path": result_path if file.content_type.startswith("image/") else None
        }

        return response

    finally:
        # Clean up temporary files
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(result_path):
            os.remove(result_path)