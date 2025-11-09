import cv2
import numpy as np
from ultralytics import YOLO
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

app = FastAPI(title="The Guardian Eye - Live Detection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("yolov8_helmet_vest.pt")

camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

if not camera.isOpened():
    print("❌ ERROR: Could not open camera.")

# Optional warmup
dummy = np.zeros((480, 640, 3), dtype=np.uint8)
model.predict(dummy, verbose=False)

def generate_frames():
    try:
        while True:
            success, frame = camera.read()
            if not success:
                break
            results = model(frame)
            annotated = results[0].plot()
            _, buffer = cv2.imencode(".jpg", annotated)
            frame_bytes = buffer.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
    finally:
        pass
    
@app.get("/view", response_class=HTMLResponse)
def view_page():
    return """
    <html>
        <head>
            <title>Live Detection</title>
        </head>
        <body style="margin:0; display:flex; flex-direction:column; align-items:center;">
            <h2>The Guardian Eye - Live Detection</h2>
            <img src="/live" width="800" height="480" />
        </body>
    </html>
    """
    
@app.get("/live")
def live_video():
    return Response(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/")
def root():
    return {"message": "Live Detection API is running!"}

@app.on_event("shutdown")
def shutdown_event():
    if camera.isOpened():   
        camera.release()
