from pathlib import Path

import pandas as pd

from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier


PROJECT_ROOT = Path(__file__).resolve().parents[1]

FEATURE_FILE = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "features"
    / "face_features.csv"
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


def evaluate_model(name, model, X, y, cv):

    print()
    print("=" * 60)
    print(name)
    print("=" * 60)

    scoring = {
        "accuracy": "accuracy",
        "precision": "precision_macro",
        "recall": "recall_macro",
        "f1": "f1_macro",
    }

    results = cross_validate(
        model,
        X,
        y,
        cv=cv,
        scoring=scoring,
        n_jobs=-1,
    )

    print(
        f"Accuracy: "
        f"{results['test_accuracy'].mean():.4f}"
        f" ± "
        f"{results['test_accuracy'].std():.4f}"
    )

    print(
        f"Macro Precision: "
        f"{results['test_precision'].mean():.4f}"
    )

    print(
        f"Macro Recall: "
        f"{results['test_recall'].mean():.4f}"
    )

    print(
        f"Macro F1: "
        f"{results['test_f1'].mean():.4f}"
        f" ± "
        f"{results['test_f1'].std():.4f}"
    )


def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("5-FOLD CROSS VALIDATION")
    print("=" * 60)

    df = pd.read_csv(
        FEATURE_FILE
    )

    # IMPORTANT:
    # Test data remains completely locked.
    df = df[
        df["split"] == "train"
    ].copy()

    X = df[
        FEATURE_COLUMNS
    ]

    y = df["label"].map(
        LABEL_MAP
    )

    print(
        f"\nSamples used: {len(X)}"
    )

    cv = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=42,
    )

    # ---------------------------------------------------------
    # Random Forest
    # ---------------------------------------------------------

    random_forest = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_split=2,
        random_state=42,
        n_jobs=-1,
    )

    evaluate_model(
        "RANDOM FOREST",
        random_forest,
        X,
        y,
        cv,
    )

    # ---------------------------------------------------------
    # XGBoost
    # ---------------------------------------------------------

    xgboost = XGBClassifier(
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

    evaluate_model(
        "XGBOOST",
        xgboost,
        X,
        y,
        cv,
    )

    print()
    print("=" * 60)
    print("CROSS VALIDATION COMPLETE")
    print("=" * 60)

    print(
        "\nThe 997-image test set was NOT used."
    )


if __name__ == "__main__":
    main()