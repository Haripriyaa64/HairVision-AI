from pathlib import Path
import sys

import cv2
import joblib
import numpy as np


# ============================================================
# HAIRVISION AI
# REAL IMAGE FACE SHAPE PREDICTION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_FILE = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
    / "xgboost_v2.joblib"
)

CALIBRATION_FILE = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
    / "confidence_calibration.joblib"
)

FEATURES = [
    "face_height",
    "face_width",
    "cheek_width",
    "jaw_width",
    "eye_distance",
    "mouth_width",
    "brow_width",
    "nose_to_chin",
    "forehead_to_nose",
    "face_ratio",
    "cheek_to_jaw_ratio",
    "jaw_to_face_ratio",
    "cheek_to_face_ratio",
    "eye_to_face_ratio",
    "mouth_to_face_ratio",
    "brow_to_face_ratio",
    "upper_face_ratio",
    "lower_face_ratio",
    "jaw_angle",
    "eye_opening",
    "symmetry_score",
]

CLASS_NAMES = {
    0: "heart",
    1: "oblong",
    2: "oval",
    3: "round",
    4: "square",
}


# ============================================================
# IMPORT FACE PIPELINE
# ============================================================

try:

    from ai.face.detector import FaceDetector
    from ai.face.landmarks import FaceLandmarkDetector
    from ai.face.features_v2 import (
    extract_features,
    FEATURE_NAMES,
)

except ImportError as error:

    raise ImportError(
        "\nCould not import HairVision AI face modules.\n"
        "Make sure you run this from the project root and set:\n\n"
        "$env:PYTHONPATH = (Get-Location).Path\n"
    ) from error


# ============================================================
# FEATURE CONVERSION
# ============================================================

def calculate_v2_features(image, landmarks):
    """
    Use the exact same V2 feature extractor
    used by the training dataset.
    """

    features = extract_features(
        landmarks
    )

    values = [
        features[name]
        for name in FEATURE_NAMES
    ]

    return np.array(
        values,
        dtype=np.float32,
    )
    """
    Convert detected face landmarks into the
    21 V2 model features.

    The existing calculate_face_features()
    function is used as the base feature extractor.
    """

    base = calculate_face_features(
        landmarks
    )

    # --------------------------------------------------------
    # Helper
    # --------------------------------------------------------

    def get_value(
        name,
        default=0.0,
    ):
        if isinstance(base, dict):
            return float(
                base.get(
                    name,
                    default,
                )
            )

        if hasattr(base, name):
            return float(
                getattr(
                    base,
                    name,
                )
            )

        return default

    # --------------------------------------------------------
    # Existing features
    # --------------------------------------------------------

    face_height = get_value(
        "face_height"
    )

    face_width = get_value(
        "face_width"
    )

    cheek_width = get_value(
        "cheek_width"
    )

    jaw_width = get_value(
        "jaw_width"
    )

    eye_distance = get_value(
        "eye_distance"
    )

    # --------------------------------------------------------
    # Derived V2 features
    # --------------------------------------------------------

    mouth_width = get_value(
        "mouth_width"
    )

    brow_width = get_value(
        "brow_width"
    )

    nose_to_chin = get_value(
        "nose_to_chin"
    )

    forehead_to_nose = get_value(
        "forehead_to_nose"
    )

    # --------------------------------------------------------
    # Ratios
    # --------------------------------------------------------

    safe_face_width = max(
        face_width,
        1e-8,
    )

    safe_face_height = max(
        face_height,
        1e-8,
    )

    face_ratio = (
        face_width
        / safe_face_height
    )

    cheek_to_jaw_ratio = (
        cheek_width
        / max(
            jaw_width,
            1e-8,
        )
    )

    jaw_to_face_ratio = (
        jaw_width
        / safe_face_width
    )

    cheek_to_face_ratio = (
        cheek_width
        / safe_face_width
    )

    eye_to_face_ratio = (
        eye_distance
        / safe_face_width
    )

    mouth_to_face_ratio = (
        mouth_width
        / safe_face_width
    )

    brow_to_face_ratio = (
        brow_width
        / safe_face_width
    )

    upper_face_ratio = (
        forehead_to_nose
        / safe_face_height
    )

    lower_face_ratio = (
        nose_to_chin
        / safe_face_height
    )

    jaw_angle = get_value(
        "jaw_angle"
    )

    eye_opening = get_value(
        "eye_opening"
    )

    symmetry_score = get_value(
        "symmetry_score"
    )

    values = [
        face_height,
        face_width,
        cheek_width,
        jaw_width,
        eye_distance,
        mouth_width,
        brow_width,
        nose_to_chin,
        forehead_to_nose,
        face_ratio,
        cheek_to_jaw_ratio,
        jaw_to_face_ratio,
        cheek_to_face_ratio,
        eye_to_face_ratio,
        mouth_to_face_ratio,
        brow_to_face_ratio,
        upper_face_ratio,
        lower_face_ratio,
        jaw_angle,
        eye_opening,
        symmetry_score,
    ]

    return np.array(
        values,
        dtype=np.float32,
    )


# ============================================================
# MAIN PREDICTION
# ============================================================

def predict_face_shape(
    image_path,
):

    image_path = Path(
        image_path
    )

    if not image_path.exists():

        raise FileNotFoundError(
            f"Image not found:\n{image_path}"
        )

    print(
        f"\nLoading image:\n{image_path}"
    )

    image = cv2.imread(
        str(image_path)
    )

    if image is None:

        raise RuntimeError(
            "Could not read image."
        )

    print(
        f"Image size: "
        f"{image.shape[1]}x"
        f"{image.shape[0]}"
    )

    # --------------------------------------------------------
    # Face detector
    # --------------------------------------------------------

    print(
        "\nDetecting face..."
    )

    face_detector = FaceDetector()

    detected_faces = (
        face_detector.detect(
            image
        )
    )

    if not detected_faces:

        raise RuntimeError(
            "No face detected in image."
        )

    print(
        f"Faces detected: "
        f"{len(detected_faces)}"
    )

    # --------------------------------------------------------
    # For now use first detected face
    # --------------------------------------------------------

    face = detected_faces[0]

    # --------------------------------------------------------
    # Landmark detection
    # --------------------------------------------------------

    print(
        "Detecting landmarks..."
    )

    landmark_detector = (
        FaceLandmarkDetector()
    )

    landmark_faces = (
        landmark_detector.detect(
            image
        )
    )

    if not landmark_faces:

        raise RuntimeError(
            "Could not detect face landmarks."
        )

    landmarks = landmark_faces[0]

    print(
        f"Landmarks detected: "
        f"{len(landmarks)}"
    )

    # --------------------------------------------------------
    # Feature extraction
    # --------------------------------------------------------

    print(
        "\nExtracting V2 features..."
    )

    feature_vector = (
        calculate_v2_features(
            image,
            landmarks,
        )
    )

    if len(feature_vector) != 21:

        raise RuntimeError(
            "Expected 21 features, "
            f"got {len(feature_vector)}."
        )

    # --------------------------------------------------------
    # Load model
    # --------------------------------------------------------

    print(
        "Loading XGBoost V2 model..."
    )

    if not MODEL_FILE.exists():

        raise FileNotFoundError(
            f"Model not found:\n{MODEL_FILE}"
        )

    model = joblib.load(
        MODEL_FILE
    )

    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    X = feature_vector.reshape(
        1,
        -1,
    )

    probabilities = (
        model.predict_proba(X)[0]
    )

    predicted_id = int(
        np.argmax(
            probabilities
        )
    )

    predicted_shape = (
        CLASS_NAMES[
            predicted_id
        ]
    )

    raw_confidence = float(
        probabilities[
            predicted_id
        ]
    )

    # --------------------------------------------------------
    # Confidence calibration
    # --------------------------------------------------------

    calibrated_confidence = (
        raw_confidence
    )

    if CALIBRATION_FILE.exists():

        calibration_data = (
            joblib.load(
                CALIBRATION_FILE
            )
        )

        calibrator = (
            calibration_data[
                "calibrator"
            ]
        )

        calibrated_confidence = float(
            calibrator.predict(
                [raw_confidence]
            )[0]
        )

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("HAIRVISION AI PREDICTION")
    print("=" * 60)

    print(
        f"\nFace Shape: "
        f"{predicted_shape.upper()}"
    )

    print(
        f"Raw confidence: "
        f"{raw_confidence:.2%}"
    )

    print(
        f"Calibrated confidence: "
        f"{calibrated_confidence:.2%}"
    )

    print(
        "\nAll probabilities:"
    )

    for class_id, probability in enumerate(
        probabilities
    ):

        shape = CLASS_NAMES[
            class_id
        ]

        print(
            f"  {shape:8} : "
            f"{probability:.2%}"
        )

    print("\n")
    print("=" * 60)

    return {
        "face_shape": predicted_shape,
        "raw_confidence": raw_confidence,
        "confidence": calibrated_confidence,
        "probabilities": {
            CLASS_NAMES[i]: float(
                probabilities[i]
            )
            for i in range(
                len(probabilities)
            )
        },
    }


# ============================================================
# COMMAND LINE
# ============================================================

def main():

    if len(sys.argv) < 2:

        print(
            "\nUsage:"
        )

        print(
            "python scripts\\"
            "predict_face_shape.py "
            "<image_path>"
        )

        print(
            "\nExample:"
        )

        print(
            "python scripts\\"
            "predict_face_shape.py "
            "data\\face\\image.png"
        )

        sys.exit(1)

    image_path = sys.argv[1]

    predict_face_shape(
        image_path
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()