# --- Prevent cv2 GUI and libGL errors in Streamlit Cloud ---
import os
os.environ["QT_QPA_PLATFORM"] = "offscreen"
os.environ["OPENCV_LOG_LEVEL"] = "ERROR"
os.environ["FORCE_HEADLESS"] = "1"

import streamlit as st
from ultralytics import YOLO
import tempfile
import cv2


# Page setup
st.set_page_config(page_title="SafetySnap - PPE Detection", layout="centered")
st.title("🦺 The Guardian Eye")
st.write("Upload an image to detect PPE compliance (Helmet, Vest, Person).")

# Load YOLO model from backend
model = YOLO("backend/yolov8_helmet_vest.pt")

# File uploader
uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    # Get file extension
    file_extension = uploaded_file.name.split(".")[-1]

    # Create temp directory and file with extension
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, f"uploaded_image.{file_extension}")

    # Write uploaded file to temp_path
    with open(temp_path, "wb") as f:
        f.write(uploaded_file.read())

    # Run YOLO detection
    with st.spinner("Detecting..."):
        results = model(temp_path)
        annotated_img = results[0].plot()

    # Display the result
    st.image(annotated_img, caption="Detection Result", use_column_width=True)
    st.success("✅ Detection complete!")
