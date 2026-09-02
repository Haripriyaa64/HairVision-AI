from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import brier_score_loss
from sklearn.model_selection import train_test_split


# ============================================================
# HAIRVISION AI
# FACE SHAPE CONFIDENCE CALIBRATION
# ============================================================


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

FEATURE_FILE = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "features"
    / "face_features_v2.csv"
)

MODEL_FILE = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
    / "xgboost_v2.joblib"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

CALIBRATION_FILE = (
    OUTPUT_DIR
    / "confidence_calibration.joblib"
)


# ============================================================
# FEATURES
# ============================================================

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


# ============================================================
# CLASS DEFINITIONS
# ============================================================

CLASSES = [
    "heart",
    "oblong",
    "oval",
    "round",
    "square",
]


# Numeric model output → human-readable label
CLASS_ID_TO_NAME = {
    0: "heart",
    1: "oblong",
    2: "oval",
    3: "round",
    4: "square",
}


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("FACE SHAPE CONFIDENCE CALIBRATION")
    print("=" * 60)

    # ========================================================
    # 1. LOAD DATASET
    # ========================================================

    print("\nLoading feature dataset...")

    if not FEATURE_FILE.exists():
        raise FileNotFoundError(
            f"Feature dataset not found:\n{FEATURE_FILE}"
        )

    df = pd.read_csv(
        FEATURE_FILE
    )

    train_df = df[
        df["split"] == "train"
    ].copy()

    print(
        f"Training samples available: "
        f"{len(train_df)}"
    )

    if len(train_df) != 3980:
        raise RuntimeError(
            f"Expected 3980 training samples, "
            f"found {len(train_df)}."
        )

    # ========================================================
    # 2. CHECK FEATURES
    # ========================================================

    missing_features = [
        feature
        for feature in FEATURES
        if feature not in train_df.columns
    ]

    if missing_features:

        raise RuntimeError(
            "Missing required features:\n"
            + "\n".join(missing_features)
        )

    # ========================================================
    # 3. CREATE CALIBRATION SET
    # ========================================================

    print("\nCreating calibration split...")

    # 20% of training data = 796 images
    #
    # Stratification ensures each face-shape class
    # is represented proportionally.

    _, calibration_df = train_test_split(
        train_df,
        test_size=0.20,
        random_state=42,
        stratify=train_df["label"],
    )

    print(
        f"Calibration samples: "
        f"{len(calibration_df)}"
    )

    # ========================================================
    # 4. CHECK CALIBRATION DISTRIBUTION
    # ========================================================

    print("\nCalibration classes:")

    print(
        calibration_df["label"]
        .value_counts()
        .sort_index()
        .to_string()
    )

    # ========================================================
    # 5. LOAD MODEL
    # ========================================================

    print(
        "\nLoading trained V2 XGBoost model..."
    )

    if not MODEL_FILE.exists():

        raise FileNotFoundError(
            f"Model not found:\n{MODEL_FILE}"
        )

    model = joblib.load(
        MODEL_FILE
    )

    print(
        "Model loaded successfully."
    )

    # ========================================================
    # 6. PREPARE INPUT
    # ========================================================

    X_calibration = calibration_df[
        FEATURES
    ]

    y_calibration = calibration_df[
        "label"
    ].to_numpy()

    # ========================================================
    # 7. GENERATE MODEL PROBABILITIES
    # ========================================================

    print(
        "\nGenerating model probabilities..."
    )

    probabilities = model.predict_proba(
        X_calibration
    )

    # ========================================================
    # 8. VERIFY MODEL CLASS FORMAT
    # ========================================================

    print("\nRaw model classes:")

    print(
        list(model.classes_)
    )

    # We explicitly use our known class mapping.
    #
    # XGBoost was trained using:
    #
    # 0 → heart
    # 1 → oblong
    # 2 → oval
    # 3 → round
    # 4 → square

    model_class_names = [
        CLASS_ID_TO_NAME[
            int(class_id)
        ]
        for class_id in model.classes_
    ]

    print("\nMapped model classes:")

    print(
        model_class_names
    )

    # ========================================================
    # 9. GET TOP PREDICTION
    # ========================================================

    predicted_indices = np.argmax(
        probabilities,
        axis=1,
    )

    predicted_probabilities = np.max(
        probabilities,
        axis=1,
    )

    predicted_labels = np.array(
        [
            model_class_names[index]
            for index in predicted_indices
        ]
    )

    # ========================================================
    # 10. DETERMINE CORRECT / INCORRECT
    # ========================================================

    correct = (
        predicted_labels
        == y_calibration
    ).astype(int)

    # ========================================================
    # 11. BASIC SANITY CHECK
    # ========================================================

    accuracy = float(
        correct.mean()
    )

    print("\n")
    print("=" * 60)
    print("CALIBRATION SANITY CHECK")
    print("=" * 60)

    print(
        f"\nCorrect predictions: "
        f"{correct.sum()}"
    )

    print(
        f"Incorrect predictions: "
        f"{len(correct) - correct.sum()}"
    )

    print(
        f"Accuracy: "
        f"{accuracy:.4f}"
    )

    if accuracy == 0:

        raise RuntimeError(
            "\nCalibration accuracy is 0.0.\n"
            "This indicates a class-label mapping problem."
        )

    # ========================================================
    # 12. BEFORE CALIBRATION
    # ========================================================

    mean_confidence_before = float(
        predicted_probabilities.mean()
    )

    print("\n")
    print("=" * 60)
    print("BEFORE CALIBRATION")
    print("=" * 60)

    print(
        f"\nAccuracy: "
        f"{accuracy:.4f}"
    )

    print(
        f"Mean confidence: "
        f"{mean_confidence_before:.4f}"
    )

    # ========================================================
    # 13. FIT ISOTONIC REGRESSION
    # ========================================================

    print("\n")
    print("=" * 60)
    print("FITTING ISOTONIC CALIBRATION")
    print("=" * 60)

    calibrator = IsotonicRegression(
        y_min=0.0,
        y_max=1.0,
        out_of_bounds="clip",
    )

    # Input:
    #
    #   raw model confidence
    #
    # Target:
    #
    #   1 = prediction correct
    #   0 = prediction incorrect

    calibrator.fit(
        predicted_probabilities,
        correct,
    )

    calibrated_probabilities = (
        calibrator.predict(
            predicted_probabilities
        )
    )

    mean_confidence_after = float(
        calibrated_probabilities.mean()
    )

    # ========================================================
    # 14. BRIER SCORE
    # ========================================================

    brier_before = float(
        brier_score_loss(
            correct,
            predicted_probabilities,
        )
    )

    brier_after = float(
        brier_score_loss(
            correct,
            calibrated_probabilities,
        )
    )

    # ========================================================
    # 15. CALIBRATION RESULTS
    # ========================================================

    print("\n")
    print("=" * 60)
    print("CALIBRATION RESULTS")
    print("=" * 60)

    print(
        f"\nAccuracy: "
        f"{accuracy:.4f}"
    )

    print(
        f"\nMean confidence BEFORE: "
        f"{mean_confidence_before:.4f}"
    )

    print(
        f"Mean confidence AFTER:  "
        f"{mean_confidence_after:.4f}"
    )

    print(
        f"\nBrier score BEFORE: "
        f"{brier_before:.4f}"
    )

    print(
        f"Brier score AFTER:  "
        f"{brier_after:.4f}"
    )

    # ========================================================
    # 16. CONFIDENCE DISTRIBUTION
    # ========================================================

    print("\n")
    print("=" * 60)
    print("CONFIDENCE DISTRIBUTION")
    print("=" * 60)

    high = int(
        np.sum(
            calibrated_probabilities >= 0.70
        )
    )

    medium = int(
        np.sum(
            (
                calibrated_probabilities >= 0.50
            )
            & (
                calibrated_probabilities < 0.70
            )
        )
    )

    low = int(
        np.sum(
            calibrated_probabilities < 0.50
        )
    )

    total = len(
        calibrated_probabilities
    )

    print(
        f"\nHigh confidence (>=70%): "
        f"{high} "
        f"({high / total:.1%})"
    )

    print(
        f"Medium confidence (50-69%): "
        f"{medium} "
        f"({medium / total:.1%})"
    )

    print(
        f"Low confidence (<50%): "
        f"{low} "
        f"({low / total:.1%})"
    )

    # ========================================================
    # 17. SAVE CALIBRATION OBJECT
    # ========================================================

    calibration_data = {
        "calibrator": calibrator,
        "model_classes": model_class_names,
        "classes": CLASSES,
        "class_id_to_name": CLASS_ID_TO_NAME,
        "calibration_samples": len(
            calibration_df
        ),
        "accuracy": accuracy,
        "mean_confidence_before": (
            mean_confidence_before
        ),
        "mean_confidence_after": (
            mean_confidence_after
        ),
        "brier_before": brier_before,
        "brier_after": brier_after,
    }

    joblib.dump(
        calibration_data,
        CALIBRATION_FILE,
    )

    # ========================================================
    # 18. EXAMPLE RESULTS
    # ========================================================

    print("\n")
    print("=" * 60)
    print("EXAMPLE CONFIDENCE CALIBRATION")
    print("=" * 60)

    example_count = min(
        10,
        len(predicted_probabilities),
    )

    example_indices = np.linspace(
        0,
        len(predicted_probabilities) - 1,
        example_count,
        dtype=int,
    )

    print()

    for index in example_indices:

        label = predicted_labels[
            index
        ]

        raw_confidence = (
            predicted_probabilities[
                index
            ]
        )

        calibrated_confidence = (
            calibrated_probabilities[
                index
            ]
        )

        status = (
            "CORRECT"
            if correct[index]
            else "WRONG"
        )

        print(
            f"{label:8} | "
            f"raw={raw_confidence:.3f} | "
            f"calibrated="
            f"{calibrated_confidence:.3f} | "
            f"{status}"
        )

    # ========================================================
    # 19. COMPLETE
    # ========================================================

    print("\n")
    print("=" * 60)
    print("CONFIDENCE CALIBRATION COMPLETE")
    print("=" * 60)

    print(
        "\nCalibration object saved to:"
    )

    print(
        CALIBRATION_FILE
    )

    print(
        "\nThe 997-image locked test set "
        "was NOT used."
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()