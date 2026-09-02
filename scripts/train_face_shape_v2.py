from pathlib import Path

import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    classification_report,
)

from xgboost import XGBClassifier


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATA_FILE = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "features"
    / "face_features_v2.csv"
)

MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
)

MODEL_FILE = (
    MODEL_DIR
    / "xgboost_v2.joblib"
)

LABEL_FILE = (
    MODEL_DIR
    / "label_encoder_v2.joblib"
)


# ============================================================
# CONFIGURATION
# ============================================================

RANDOM_STATE = 42

TARGET_COLUMN = "label"

# Metadata columns that must NOT be used as ML features
NON_FEATURE_COLUMNS = [
    "split",
    "image",
    "label",
]


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("FACE SHAPE MODEL V2 TRAINING")
    print("=" * 60)

    # --------------------------------------------------------
    # Load dataset
    # --------------------------------------------------------

    print("\nLoading V2 feature dataset...")

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found:\n{DATA_FILE}"
        )

    df = pd.read_csv(DATA_FILE)

    print(
        f"Total feature rows: {len(df)}"
    )

    # --------------------------------------------------------
    # Keep the original train/test separation
    # --------------------------------------------------------

    train_df = df[
        df["split"] == "train"
    ].copy()

    locked_test_df = df[
        df["split"] == "test"
    ].copy()

    print(
        f"Training samples: {len(train_df)}"
    )

    print(
        f"Test samples locked: "
        f"{len(locked_test_df)}"
    )

    # --------------------------------------------------------
    # Feature columns
    # --------------------------------------------------------

    feature_columns = [
        column
        for column in train_df.columns
        if column not in NON_FEATURE_COLUMNS
    ]

    print(
        f"\nNumber of V2 features: "
        f"{len(feature_columns)}"
    )

    print("\nFeatures:")

    for feature in feature_columns:
        print(f"  - {feature}")

    # --------------------------------------------------------
    # X and y
    # --------------------------------------------------------

    X = train_df[
        feature_columns
    ]

    y = train_df[
        TARGET_COLUMN
    ]

    # --------------------------------------------------------
    # Encode labels
    # --------------------------------------------------------

    label_encoder = LabelEncoder()

    y_encoded = label_encoder.fit_transform(y)

    print("\nClasses:")

    for index, class_name in enumerate(
        label_encoder.classes_
    ):
        print(
            f"  {index}: {class_name}"
        )

    # --------------------------------------------------------
    # Validation split
    #
    # IMPORTANT:
    # The original 997 test images remain untouched.
    # --------------------------------------------------------

    print(
        "\nCreating validation split..."
    )

    X_train, X_validation, y_train, y_validation = (
        train_test_split(
            X,
            y_encoded,
            test_size=0.20,
            random_state=RANDOM_STATE,
            stratify=y_encoded,
        )
    )

    print(
        f"Train:      {len(X_train)}"
    )

    print(
        f"Validation: {len(X_validation)}"
    )

    print(
        f"Locked test: {len(locked_test_df)}"
    )

    # --------------------------------------------------------
    # XGBoost model
    # --------------------------------------------------------

    print(
        "\nTraining XGBoost V2..."
    )

    model = XGBClassifier(
        objective="multi:softprob",
        num_class=len(
            label_encoder.classes_
        ),
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=2,
        gamma=0,
        reg_alpha=0,
        reg_lambda=1,
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train,
    )

    print(
        "Training complete."
    )

    # --------------------------------------------------------
    # Validation prediction
    # --------------------------------------------------------

    print(
        "\nValidation prediction..."
    )

    validation_predictions = (
        model.predict(X_validation)
    )

    validation_accuracy = (
        accuracy_score(
            y_validation,
            validation_predictions,
        )
    )

    print(
        f"\nValidation Accuracy: "
        f"{validation_accuracy:.4f}"
    )

    # --------------------------------------------------------
    # Classification report
    # --------------------------------------------------------

    print(
        "\nClassification Report:"
    )

    print(
        classification_report(
            y_validation,
            validation_predictions,
            target_names=(
                label_encoder.classes_
            ),
            digits=4,
        )
    )

    # --------------------------------------------------------
    # Save model
    # --------------------------------------------------------

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        model,
        MODEL_FILE,
    )

    joblib.dump(
        label_encoder,
        LABEL_FILE,
    )

    print(
        "\nModel saved to:"
    )

    print(
        MODEL_FILE
    )

    print(
        "\nLabel encoder saved to:"
    )

    print(
        LABEL_FILE
    )

    # --------------------------------------------------------
    # Final summary
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("V2 TRAINING COMPLETE")
    print("=" * 60)

    print(
        f"Validation Accuracy: "
        f"{validation_accuracy:.4f}"
    )

    print(
        "\nThe 997-image test set "
        "was NOT used."
    )


if __name__ == "__main__":
    main()