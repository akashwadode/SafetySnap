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

app = FastAPI(title="The Guardian Eye")
security = HTTPBearer()

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

cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(cred)

init_db()
model = YOLO("yolov8_helmet_vest.pt")

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user_id: str = Depends(verify_token)):
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
        detections = []
        results = model(temp_path)
        image = cv2.imread(temp_path)
        font = cv2.FONT_HERSHEY_SIMPLEX

        for result in results:
            for i, box in enumerate(result.boxes):
                cls_id = int(box.cls)
                label = result.names[cls_id]
                confidence = float(box.conf)
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                if "helmet" in label.lower():
                    color = (0, 255, 0)
                elif "vest" in label.lower():
                    color = (255, 165, 0)
                else:
                    color = (0, 0, 255)

                cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)

                text = f"{label} ({confidence*100:.1f}%)"
                font_scale = 0.45
                thickness = 1
                (text_w, text_h), _ = cv2.getTextSize(text, font, font_scale, thickness)

                # Offset labels slightly to prevent overlapping
                label_offset = 20 * i
                y_text = max(y1 - 5 - label_offset, text_h + 5)
                x_text = x1

                cv2.rectangle(image, (x_text, y_text - text_h - 4), (x_text + text_w + 2, y_text + 2), color, -1)
                cv2.putText(image, text, (x_text, y_text - 2), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

                detections.append({
                    "label": label,
                    "confidence": confidence,
                    "bbox": [x1, y1, x2, y2]
                })

        result_path = os.path.join(temp_dir, f"result_{temp_filename}")
        cv2.imwrite(result_path, image)

        with open(result_path, "rb") as img_file:
            result_image_base64 = base64.b64encode(img_file.read()).decode("utf-8")

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

        return {
            "upload_id": upload_id,
            "filename": file.filename,
            "detections": detections,
            "result_image_base64": result_image_base64
        }

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if 'result_path' in locals() and os.path.exists(result_path):
            os.remove(result_path)

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

            if filename:
                query += " AND filename LIKE ?"
                params.append(f"%{filename}%")
            if start_date:
                query += " AND upload_time >= ?"
                params.append(start_date)
            if end_date:
                query += " AND upload_time <= ?"
                params.append(end_date)

            cursor.execute(f"SELECT COUNT(*) FROM ({query})", params)
            total_records = cursor.fetchone()[0]

            query += " ORDER BY upload_time DESC LIMIT ? OFFSET ?"
            params.extend([per_page, (page - 1) * per_page])

            cursor.execute(query, params)
            uploads = cursor.fetchall()

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

@app.get("/analytics")
async def get_analytics(
    user_id: str = Depends(verify_token),
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            query = "SELECT COUNT(*) FROM uploads WHERE user_id = ?"
            params = [user_id]
            if start_date:
                query += " AND upload_time >= ?"
                params.append(start_date)
            if end_date:
                query += " AND upload_time <= ?"
                params.append(end_date)
            cursor.execute(query, params)
            total_uploads = cursor.fetchone()[0]

            query = "SELECT detection_results FROM uploads WHERE user_id = ?"
            params = [user_id]
            if start_date:
                query += " AND upload_time >= ?"
                params.append(start_date)
            if end_date:
                query += " AND upload_time <= ?"
                params.append(end_date)
            cursor.execute(query, params)
            uploads = cursor.fetchall()

            label_counts = {}
            for row in uploads:
                detections = json.loads(row[0]) if row[0] else []
                for detection in detections:
                    label = detection["label"]
                    label_counts[label] = label_counts.get(label, 0) + 1

            query = """
                SELECT DATE(upload_time) as date, detection_results
                FROM uploads
                WHERE user_id = ?
            """
            params = [user_id]
            if start_date:
                query += " AND upload_time >= ?"
                params.append(start_date)
            if end_date:
                query += " AND upload_time <= ?"
                params.append(end_date)
            query += " ORDER BY date"
            cursor.execute(query, params)
            daily_data = cursor.fetchall()

            daily_trends = {}
            for row in daily_data:
                date = row[0]
                detections = json.loads(row[1]) if row[1] else []
                daily_trends[date] = daily_trends.get(date, {})
                for detection in detections:
                    label = detection["label"]
                    daily_trends[date][label] = daily_trends[date].get(label, 0) + 1

            return {
                "total_uploads": total_uploads,
                "label_counts": label_counts,
                "daily_trends": daily_trends
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {str(e)}")

@app.get("/")
def root():
    return {"message": "The Guardian Eye backend is running!"}
