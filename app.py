import os
# 🩵 Fix for Streamlit Cloud: prevent cv2 GUI loading (libGL.so.1 missing)
os.environ["QT_QPA_PLATFORM"] = "offscreen"
os.environ["OPENCV_VIDEOIO_PRIORITY_MSMF"] = "0"
os.environ["OPENCV_LOG_LEVEL"] = "ERROR"
os.environ["FORCE_HEADLESS"] = "1"

import streamlit as st
try:
    from ultralytics import YOLO
except ImportError:
    import cv2
    raise RuntimeError("⚠️ Ultralytics or OpenCV failed to load. Ensure headless mode is enabled.")

import tempfile
from PIL import Image
import numpy as np

# 🌐 Page setup
st.set_page_config(page_title="🦺 SafetySnap - PPE Detection", layout="centered")
st.title("🦺 The Guardian Eye")
st.write("Upload an image to detect PPE compliance (Helmet, Vest, Person).")

# 🧠 Load YOLO model
model = YOLO("backend/yolov8_helmet_vest.pt")

# 📸 File uploader
uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])

if uploaded_file:
    image = Image.open(uploaded_file)

    # ✅ Convert RGBA → RGB
    if image.mode == "RGBA":
        image = image.convert("RGB")

    st.image(image, caption="Uploaded Image", use_column_width=True)

    # ✅ Convert to NumPy array
    img_array = np.array(image)

    # ✅ Run YOLO inference
    with st.spinner("Detecting..."):
        results = model.predict(source=img_array, conf=0.4)
        annotated_img = results[0].plot()

    # ✅ Show results
    st.image(annotated_img, caption="Detection Result", use_column_width=True)
    st.success("✅ Detection complete!")

    # ✅ Display detected classes
    if results[0].boxes is not None:
        for box in results[0].boxes:
            cls = int(box.cls[0])
            conf = round(float(box.conf[0]), 2)
            label = model.names[cls]
            st.write(f"**{label}** detected with confidence **{conf}**")
    else:
        st.warning("No PPE items detected in the image.")
