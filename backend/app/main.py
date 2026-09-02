from pathlib import Path
import sys
import cv2
import joblib
import numpy as np

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# =========================================================
# PROJECT PATHS
# =========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
    / "xgboost_v2.joblib"
)

CALIBRATION_PATH = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
    / "confidence_calibration.joblib"
)

# =========================================================
# PYTHON PATH
# =========================================================

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# =========================================================
# HAIRVISION COMPONENTS
# =========================================================

from ai.face.landmarks import FaceLandmarkDetector
from ai.face.features_v2 import (
    extract_features,
    FEATURE_NAMES,
)

from ai.hairstyles.recommend import recommend_hairstyles

# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="HairVision AI API",
    description="AI-powered face shape and hairstyle analysis API",
    version="1.0.0",
)

# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# GLOBAL ML COMPONENTS
# =========================================================

model = None
calibration = None
detector = None

CLASS_NAMES = [
    "heart",
    "oblong",
    "oval",
    "round",
    "square",
]

# =========================================================
# REQUEST MODELS
# =========================================================

class RecommendationRequest(BaseModel):
    face_shape: str = Field(..., description="Detected face shape")
    gender: str = Field(..., description="men or women")
    limit: int = Field(
        default=6,
        ge=1,
        le=20,
        description="Number of hairstyles to return",
    )


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
def load_models():

    global model
    global calibration
    global detector

    print("=" * 60)
    print("HAIRVISION AI API")
    print("Loading ML components...")
    print("=" * 60)

    print("\nProject root:")
    print(PROJECT_ROOT)

    print("\nModel path:")
    print(MODEL_PATH)

    print("\nCalibration path:")
    print(CALIBRATION_PATH)

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found:\n{MODEL_PATH}"
        )

    if not CALIBRATION_PATH.exists():
        raise FileNotFoundError(
            f"Calibration file not found:\n{CALIBRATION_PATH}"
        )

    model = joblib.load(MODEL_PATH)
    calibration = joblib.load(CALIBRATION_PATH)

    detector = FaceLandmarkDetector()

    print("\nModel loaded successfully.")
    print("Calibration loaded successfully.")
    print("Face detector loaded successfully.")

    print("=" * 60)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "name": "HairVision AI",
        "status": "running",
        "service": "Face Shape Analysis API",
        "version": "1.0.0",
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "calibration_loaded": calibration is not None,
        "face_detector_loaded": detector is not None,
    }


# =========================================================
# FACE ANALYSIS
# =========================================================

@app.post("/analyze")
async def analyze_face(
    file: UploadFile = File(...)
):

    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type.",
        )

    allowed_types = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format. "
                "Use JPG, JPEG, PNG or WEBP."
            ),
        )

    # -----------------------------------------------------
    # READ IMAGE
    # -----------------------------------------------------

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    image_array = np.frombuffer(
        contents,
        dtype=np.uint8,
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Could not decode uploaded image.",
        )

    # -----------------------------------------------------
    # FACE DETECTION
    # -----------------------------------------------------

    try:

        faces = detector.detect(image)

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Face detection failed: {exc}",
        )

    if not faces:

        raise HTTPException(
            status_code=422,
            detail=(
                "No face detected. "
                "Please upload a clear front-facing photo."
            ),
        )

    if len(faces) > 1:

        raise HTTPException(
            status_code=422,
            detail=(
                "Multiple faces detected. "
                "Please upload an image containing one face."
            ),
        )

    face = faces[0]

    # -----------------------------------------------------
    # FEATURE EXTRACTION
    # -----------------------------------------------------

    try:

        features = extract_features(face)

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Feature extraction failed: {exc}",
        )

    # -----------------------------------------------------
    # MODEL INPUT
    # -----------------------------------------------------

    feature_vector = np.array(
        [
            float(features[name])
            for name in FEATURE_NAMES
        ],
        dtype=np.float32,
    ).reshape(1, -1)

    # -----------------------------------------------------
    # PREDICTION
    # -----------------------------------------------------

    try:

        probabilities = model.predict_proba(
            feature_vector
        )[0]

        predicted_index = int(
            np.argmax(probabilities)
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Model prediction failed: {exc}",
        )

    predicted_shape = CLASS_NAMES[predicted_index]

    raw_confidence = float(
        probabilities[predicted_index]
    )

    # -----------------------------------------------------
    # CALIBRATION
    # -----------------------------------------------------

    calibrated_confidence = raw_confidence

    try:

        calibrated = calibration.predict(
            probabilities.reshape(1, -1)
        )

        calibrated_confidence = float(
            calibrated[0]
        )

    except Exception:

        calibrated_confidence = raw_confidence

    calibrated_confidence = max(
        0.0,
        min(1.0, calibrated_confidence),
    )

    # -----------------------------------------------------
    # PROBABILITIES
    # -----------------------------------------------------

    probability_dict = {}

    for index, class_name in enumerate(CLASS_NAMES):

        probability_dict[class_name] = round(
            float(probabilities[index]),
            4,
        )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "success": True,
        "face_shape": predicted_shape,
        "confidence": round(
            calibrated_confidence,
            4,
        ),
        "raw_confidence": round(
            raw_confidence,
            4,
        ),
        "probabilities": probability_dict,
        "features_used": len(FEATURE_NAMES),
    }


# =========================================================
# HAIRSTYLE RECOMMENDATIONS
# =========================================================

@app.post("/recommend")
def recommend(request: RecommendationRequest):

    face_shape = request.face_shape.lower().strip()
    gender = request.gender.lower().strip()

    valid_face_shapes = {
        "heart",
        "oblong",
        "oval",
        "round",
        "square",
    }

    valid_genders = {
        "men",
        "women",
    }

    if face_shape not in valid_face_shapes:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid face shape. "
                "Use heart, oblong, oval, round or square."
            ),
        )

    if gender not in valid_genders:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid gender. "
                "Use men or women."
            ),
        )

    try:

        recommendations = recommend_hairstyles(
            face_shape=face_shape,
            gender=gender,
            limit=request.limit,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Recommendation failed: {exc}",
        )

    return {
        "success": True,
        "face_shape": face_shape,
        "gender": gender,
        "count": len(recommendations),
        "recommendations": recommendations,
    }


# =========================================================
# RUN DIRECTLY
# =========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )