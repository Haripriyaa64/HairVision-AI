from pathlib import Path

import joblib
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
)
from sklearn.model_selection import train_test_split


PROJECT_ROOT = Path(__file__).resolve().parents[1]

FEATURE_FILE = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "features"
    / "face_features.csv"
)

MODEL_FILE = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
    / "random_forest.joblib"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "face_shape"
)

FEATURE_COLUMNS = [
    "face_height",
    "face_width",
    "cheek_width",
    "jaw_width",
    "chin_width",
    "eye_distance",
    "face_ratio",
    "cheek_ratio",
    "jaw_ratio",
    "chin_ratio",
    "eye_ratio",
    "cheek_to_jaw_ratio",
    "jaw_angle",
    "nose_vertical_ratio",
]


def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("FACE SHAPE MODEL DIAGNOSTICS")
    print("=" * 60)

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ---------------------------------------------------------
    # Load dataset
    # ---------------------------------------------------------

    df = pd.read_csv(FEATURE_FILE)

    train_df = df[
        df["split"] == "train"
    ].copy()

    X = train_df[FEATURE_COLUMNS]
    y = train_df["label"]

    # ---------------------------------------------------------
    # Recreate EXACT validation split
    # ---------------------------------------------------------

    X_train, X_val, y_train, y_val = (
        train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y,
        )
    )

    # ---------------------------------------------------------
    # Load trained model
    # ---------------------------------------------------------

    bundle = joblib.load(MODEL_FILE)

    model = bundle["model"]

    # ---------------------------------------------------------
    # Predictions
    # ---------------------------------------------------------

    predictions = model.predict(X_val)

    accuracy = accuracy_score(
        y_val,
        predictions,
    )

    print()
    print(
        f"Validation Accuracy: {accuracy:.4f}"
    )

    # ---------------------------------------------------------
    # Classification report
    # ---------------------------------------------------------

    print()
    print("=" * 60)
    print("CLASSIFICATION REPORT")
    print("=" * 60)

    print(
        classification_report(
            y_val,
            predictions,
        )
    )

    # ---------------------------------------------------------
    # Confusion matrix
    # ---------------------------------------------------------

    cm = confusion_matrix(
        y_val,
        predictions,
        labels=model.classes_,
    )

    print()
    print("=" * 60)
    print("CONFUSION MATRIX")
    print("=" * 60)

    print(
        pd.DataFrame(
            cm,
            index=model.classes_,
            columns=model.classes_,
        )
    )

    display = ConfusionMatrixDisplay(
        confusion_matrix=cm,
        display_labels=model.classes_,
    )

    display.plot(
        xticks_rotation=45,
    )

    plt.title(
        "Face Shape Random Forest - Confusion Matrix"
    )

    plt.tight_layout()

    confusion_file = (
        OUTPUT_DIR
        / "confusion_matrix.png"
    )

    plt.savefig(
        confusion_file,
        dpi=150,
    )

    plt.close()

    # ---------------------------------------------------------
    # Feature importance
    # ---------------------------------------------------------

    importance = pd.DataFrame(
        {
            "feature": FEATURE_COLUMNS,
            "importance": model.feature_importances_,
        }
    )

    importance = importance.sort_values(
        "importance",
        ascending=False,
    )

    print()
    print("=" * 60)
    print("FEATURE IMPORTANCE")
    print("=" * 60)

    print(
        importance.to_string(
            index=False
        )
    )

    importance_file = (
        OUTPUT_DIR
        / "feature_importance.csv"
    )

    importance.to_csv(
        importance_file,
        index=False,
    )

    # ---------------------------------------------------------
    # Feature importance chart
    # ---------------------------------------------------------

    plt.figure(
        figsize=(10, 6)
    )

    plt.barh(
        importance["feature"],
        importance["importance"],
    )

    plt.gca().invert_yaxis()

    plt.title(
        "Random Forest Feature Importance"
    )

    plt.xlabel(
        "Importance"
    )

    plt.tight_layout()

    importance_image = (
        OUTPUT_DIR
        / "feature_importance.png"
    )

    plt.savefig(
        importance_image,
        dpi=150,
    )

    plt.close()

    print()
    print("=" * 60)
    print("DIAGNOSTICS COMPLETE")
    print("=" * 60)

    print(
        f"\nConfusion matrix:"
        f"\n{confusion_file}"
    )

    print(
        f"\nFeature importance:"
        f"\n{importance_file}"
    )

    print(
        f"\nFeature chart:"
        f"\n{importance_image}"
    )


if __name__ == "__main__":
    main()