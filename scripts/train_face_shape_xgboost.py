from pathlib import Path

import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
)

from xgboost import XGBClassifier


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

MODEL_FILE = (
    MODEL_DIR
    / "xgboost.joblib"
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


LABEL_MAP = {
    "heart": 0,
    "oblong": 1,
    "oval": 2,
    "round": 3,
    "square": 4,
}


REVERSE_LABEL_MAP = {
    value: key
    for key, value in LABEL_MAP.items()
}


def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("XGBOOST FACE SHAPE MODEL")
    print("=" * 60)

    # ---------------------------------------------------------
    # Load dataset
    # ---------------------------------------------------------

    df = pd.read_csv(FEATURE_FILE)

    train_df = df[
        df["split"] == "train"
    ].copy()

    X = train_df[FEATURE_COLUMNS]

    y = train_df["label"].map(
        LABEL_MAP
    )

    print(
        f"\nTotal training samples: {len(X)}"
    )

    # ---------------------------------------------------------
    # Same validation split as Random Forest
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

    print(
        f"Training samples:   {len(X_train)}"
    )

    print(
        f"Validation samples: {len(X_val)}"
    )

    # ---------------------------------------------------------
    # XGBoost
    # ---------------------------------------------------------

    print(
        "\nTraining XGBoost..."
    )

    model = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="multi:softprob",
        num_class=5,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train,
    )

    print(
        "Training complete."
    )

    # ---------------------------------------------------------
    # Validation
    # ---------------------------------------------------------

    predictions = model.predict(
        X_val
    )

    accuracy = accuracy_score(
        y_val,
        predictions,
    )

    print()
    print("=" * 60)
    print("VALIDATION RESULTS")
    print("=" * 60)

    print(
        f"\nValidation Accuracy: "
        f"{accuracy:.4f}"
    )

    print()
    print(
        classification_report(
            y_val,
            predictions,
            target_names=[
                REVERSE_LABEL_MAP[i]
                for i in range(5)
            ],
        )
    )

    # ---------------------------------------------------------
    # Save model
    # ---------------------------------------------------------

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        {
            "model": model,
            "features": FEATURE_COLUMNS,
            "label_map": LABEL_MAP,
        },
        MODEL_FILE,
    )

    print(
        f"\nModel saved to:"
        f"\n{MODEL_FILE}"
    )


if __name__ == "__main__":
    main()