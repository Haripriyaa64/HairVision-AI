from pathlib import Path

import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score


PROJECT_ROOT = Path(__file__).resolve().parents[1]

FEATURE_FILE = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "features"
    / "face_features.csv"
)

MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
)

MODEL_FILE = MODEL_DIR / "random_forest.joblib"


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
    print("FACE SHAPE MODEL TRAINING")
    print("=" * 60)

    print("\nLoading dataset...")

    df = pd.read_csv(FEATURE_FILE)

    train_df = df[
        df["split"] == "train"
    ].copy()

    test_df = df[
        df["split"] == "test"
    ].copy()

    X = train_df[FEATURE_COLUMNS]

    y = train_df["label"]

    print(
        f"Training samples: {len(X)}"
    )

    print(
        f"Test samples locked: {len(test_df)}"
    )

    print("\nCreating validation split...")

    X_train, X_val, y_train, y_val = (
        train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y,
        )
    )

    print(
        f"Train:      {len(X_train)}"
    )

    print(
        f"Validation: {len(X_val)}"
    )

    print("\nTraining Random Forest...")

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train,
    )

    print("Training complete.")

    print("\nValidation prediction...")

    predictions = model.predict(X_val)

    accuracy = accuracy_score(
        y_val,
        predictions,
    )

    print(
        f"\nValidation Accuracy: "
        f"{accuracy:.4f}"
    )

    print("\nClassification Report:")
    print(
        classification_report(
            y_val,
            predictions,
        )
    )

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        {
            "model": model,
            "features": FEATURE_COLUMNS,
        },
        MODEL_FILE,
    )

    print(
        f"\nModel saved to:\n{MODEL_FILE}"
    )


if __name__ == "__main__":
    main()