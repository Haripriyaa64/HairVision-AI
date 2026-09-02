from pathlib import Path

import joblib
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)


# ============================================================
# PATHS
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
    / "outputs"
    / "face_shape"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
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


CLASSES = [
    "heart",
    "oblong",
    "oval",
    "round",
    "square",
]


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("FINAL FACE SHAPE MODEL EVALUATION")
    print("=" * 60)

    # --------------------------------------------------------
    # Load dataset
    # --------------------------------------------------------

    print("\nLoading feature dataset...")

    df = pd.read_csv(FEATURE_FILE)

    # IMPORTANT:
    # Only use the locked TEST split.
    test_df = df[df["split"] == "test"].copy()

    print(f"Total feature rows: {len(df)}")
    print(f"Locked test samples: {len(test_df)}")

    if len(test_df) != 997:
        raise RuntimeError(
            f"Expected 997 locked test samples, "
            f"found {len(test_df)}."
        )

    # --------------------------------------------------------
    # Prepare X and y
    # --------------------------------------------------------

    X_test = test_df[FEATURES]

    y_test = test_df["label"]

    print("\nTest classes:")

    print(
        y_test.value_counts()
        .sort_index()
        .to_string()
    )

    # --------------------------------------------------------
    # Load model
    # --------------------------------------------------------

    print("\nLoading V2 XGBoost model...")

    model = joblib.load(MODEL_FILE)

    print("Model loaded successfully.")

    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    print("\nRunning FINAL prediction...")

    predictions = model.predict(X_test)

    # XGBoost may return numeric class IDs.
    if not isinstance(predictions[0], str):

        predictions = [
            CLASSES[int(prediction)]
            for prediction in predictions
        ]

    # --------------------------------------------------------
    # Metrics
    # --------------------------------------------------------

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

    precision = precision_score(
        y_test,
        predictions,
        average="macro",
        zero_division=0,
    )

    recall = recall_score(
        y_test,
        predictions,
        average="macro",
        zero_division=0,
    )

    f1 = f1_score(
        y_test,
        predictions,
        average="macro",
        zero_division=0,
    )

    # --------------------------------------------------------
    # Print results
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("FINAL TEST RESULTS")
    print("=" * 60)

    print(f"\nAccuracy:          {accuracy:.4f}")
    print(f"Macro Precision:   {precision:.4f}")
    print(f"Macro Recall:      {recall:.4f}")
    print(f"Macro F1:          {f1:.4f}")

    # --------------------------------------------------------
    # Classification report
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("CLASSIFICATION REPORT")
    print("=" * 60)

    report = classification_report(
        y_test,
        predictions,
        labels=CLASSES,
        zero_division=0,
    )

    print(report)

    # --------------------------------------------------------
    # Confusion matrix
    # --------------------------------------------------------

    print("=" * 60)
    print("CONFUSION MATRIX")
    print("=" * 60)

    matrix = confusion_matrix(
        y_test,
        predictions,
        labels=CLASSES,
    )

    matrix_df = pd.DataFrame(
        matrix,
        index=CLASSES,
        columns=CLASSES,
    )

    print()
    print(matrix_df.to_string())

    # --------------------------------------------------------
    # Save predictions
    # --------------------------------------------------------

    results_df = test_df[
        ["image", "label"]
    ].copy()

    results_df["prediction"] = predictions

    results_df["correct"] = (
        results_df["label"]
        == results_df["prediction"]
    )

    prediction_file = (
        OUTPUT_DIR
        / "final_test_predictions.csv"
    )

    results_df.to_csv(
        prediction_file,
        index=False,
    )

    # --------------------------------------------------------
    # Save metrics
    # --------------------------------------------------------

    metrics_file = (
        OUTPUT_DIR
        / "final_test_metrics.txt"
    )

    with metrics_file.open(
        "w",
        encoding="utf-8",
    ) as file:

        file.write(
            "HAIRVISION AI\n"
            "FINAL FACE SHAPE MODEL EVALUATION\n"
            "\n"
        )

        file.write(
            f"Test samples: {len(test_df)}\n"
        )

        file.write(
            f"Accuracy: {accuracy:.6f}\n"
        )

        file.write(
            f"Macro Precision: {precision:.6f}\n"
        )

        file.write(
            f"Macro Recall: {recall:.6f}\n"
        )

        file.write(
            f"Macro F1: {f1:.6f}\n"
        )

    print("\n")
    print("=" * 60)
    print("FINAL EVALUATION COMPLETE")
    print("=" * 60)

    print("\nPredictions saved to:")
    print(prediction_file)

    print("\nMetrics saved to:")
    print(metrics_file)

    print("\nIMPORTANT:")
    print(
        "The 997-image test set was used ONLY for "
        "final evaluation."
    )


if __name__ == "__main__":
    main()