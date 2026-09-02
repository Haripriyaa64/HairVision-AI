from pathlib import Path

import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

FEATURE_FILE = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "features"
    / "face_features.csv"
)

RF_MODEL_FILE = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
    / "random_forest.joblib"
)

XGB_MODEL_FILE = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
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


def evaluate_model(
    name,
    model,
    X_val,
    y_val,
):

    predictions = model.predict(X_val)

    accuracy = accuracy_score(
        y_val,
        predictions,
    )

    precision = precision_score(
        y_val,
        predictions,
        average="macro",
        zero_division=0,
    )

    recall = recall_score(
        y_val,
        predictions,
        average="macro",
        zero_division=0,
    )

    f1 = f1_score(
        y_val,
        predictions,
        average="macro",
        zero_division=0,
    )

    return {
        "Model": name,
        "Accuracy": accuracy,
        "Macro Precision": precision,
        "Macro Recall": recall,
        "Macro F1": f1,
    }


def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("MODEL COMPARISON")
    print("=" * 60)

    df = pd.read_csv(
        FEATURE_FILE
    )

    train_df = df[
        df["split"] == "train"
    ].copy()

    X = train_df[
        FEATURE_COLUMNS
    ]

    y_text = train_df["label"]

    # Same label encoding used by XGBoost
    y_xgb = y_text.map(
        LABEL_MAP
    )

    # IMPORTANT:
    # Same random_state and stratification
    # used during both model trainings.
    X_train, X_val, y_train, y_val = (
        train_test_split(
            X,
            y_xgb,
            test_size=0.20,
            random_state=42,
            stratify=y_xgb,
        )
    )

    print(
        f"\nValidation samples: {len(X_val)}"
    )

    # ---------------------------------------------------------
    # Load Random Forest
    # ---------------------------------------------------------

    rf_bundle = joblib.load(
        RF_MODEL_FILE
    )

    rf_model = rf_bundle["model"]

    # Random Forest was trained with text labels.
    # Convert validation labels back to text.
    y_val_text = y_val.map(
        {
            0: "heart",
            1: "oblong",
            2: "oval",
            3: "round",
            4: "square",
        }
    )

    rf_result = evaluate_model(
        "Random Forest",
        rf_model,
        X_val,
        y_val_text,
    )

    # ---------------------------------------------------------
    # Load XGBoost
    # ---------------------------------------------------------

    xgb_bundle = joblib.load(
        XGB_MODEL_FILE
    )

    xgb_model = xgb_bundle["model"]

    xgb_result = evaluate_model(
        "XGBoost",
        xgb_model,
        X_val,
        y_val,
    )

    # ---------------------------------------------------------
    # Results
    # ---------------------------------------------------------

    results = pd.DataFrame(
        [
            rf_result,
            xgb_result,
        ]
    )

    print()
    print("=" * 60)
    print("MODEL COMPARISON RESULTS")
    print("=" * 60)

    print(
        results.to_string(
            index=False,
            float_format=lambda x: f"{x:.4f}",
        )
    )

    # ---------------------------------------------------------
    # Determine winner by Macro F1
    # ---------------------------------------------------------

    winner = results.loc[
        results["Macro F1"].idxmax()
    ]

    print()
    print("=" * 60)
    print("CURRENT BEST MODEL")
    print("=" * 60)

    print(
        f"Model: {winner['Model']}"
    )

    print(
        f"Macro F1: {winner['Macro F1']:.4f}"
    )

    print(
        f"Accuracy: {winner['Accuracy']:.4f}"
    )


if __name__ == "__main__":
    main()