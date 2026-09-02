from pathlib import Path

import pandas as pd

from sklearn.model_selection import StratifiedKFold, cross_validate
from xgboost import XGBClassifier


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATA_FILE = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "features"
    / "face_features_v2.csv"
)


RANDOM_STATE = 42


def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("FACE SHAPE V2 - 5 FOLD CROSS VALIDATION")
    print("=" * 60)

    # ---------------------------------------------------------
    # Load dataset
    # ---------------------------------------------------------

    df = pd.read_csv(DATA_FILE)

    # IMPORTANT:
    # Only the original training partition is used.
    # The 997 test images remain locked.
    train_df = df[
        df["split"] == "train"
    ].copy()

    print(
        f"\nTraining samples: {len(train_df)}"
    )

    # ---------------------------------------------------------
    # Automatically select V2 features
    # ---------------------------------------------------------

    excluded_columns = {
        "split",
        "image",
        "label",
    }

    feature_columns = [
        column
        for column in train_df.columns
        if column not in excluded_columns
    ]

    X = train_df[
        feature_columns
    ]

    # Convert labels to integers
    label_map = {
        "heart": 0,
        "oblong": 1,
        "oval": 2,
        "round": 3,
        "square": 4,
    }

    y = train_df[
        "label"
    ].map(label_map)

    print(
        f"V2 features: {len(feature_columns)}"
    )

    print(
        "\nFeatures:"
    )

    for feature in feature_columns:
        print(
            f"  - {feature}"
        )

    # ---------------------------------------------------------
    # 5-fold stratified cross validation
    # ---------------------------------------------------------

    cv = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    # ---------------------------------------------------------
    # XGBoost
    # ---------------------------------------------------------

    model = XGBClassifier(
        objective="multi:softprob",
        num_class=5,

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

    print()
    print("=" * 60)
    print("RUNNING 5-FOLD CROSS VALIDATION")
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

    # ---------------------------------------------------------
    # Results
    # ---------------------------------------------------------

    accuracy_mean = (
        results["test_accuracy"].mean()
    )

    accuracy_std = (
        results["test_accuracy"].std()
    )

    precision_mean = (
        results["test_precision"].mean()
    )

    recall_mean = (
        results["test_recall"].mean()
    )

    f1_mean = (
        results["test_f1"].mean()
    )

    f1_std = (
        results["test_f1"].std()
    )

    print()
    print("=" * 60)
    print("V2 CROSS-VALIDATION RESULTS")
    print("=" * 60)

    print(
        f"\nAccuracy:"
        f" {accuracy_mean:.4f}"
        f" ± {accuracy_std:.4f}"
    )

    print(
        f"Macro Precision:"
        f" {precision_mean:.4f}"
    )

    print(
        f"Macro Recall:"
        f" {recall_mean:.4f}"
    )

    print(
        f"Macro F1:"
        f" {f1_mean:.4f}"
        f" ± {f1_std:.4f}"
    )

    # ---------------------------------------------------------
    # Compare against V1 baseline
    # ---------------------------------------------------------

    V1_ACCURACY = 0.5055
    V1_F1 = 0.5032

    accuracy_improvement = (
        accuracy_mean
        - V1_ACCURACY
    )

    f1_improvement = (
        f1_mean
        - V1_F1
    )

    print()
    print("=" * 60)
    print("V1 vs V2")
    print("=" * 60)

    print(
        f"\nV1 Accuracy: "
        f"{V1_ACCURACY:.4f}"
    )

    print(
        f"V2 Accuracy: "
        f"{accuracy_mean:.4f}"
    )

    print(
        f"Accuracy improvement: "
        f"{accuracy_improvement:+.4f}"
    )

    print(
        f"\nV1 Macro F1: "
        f"{V1_F1:.4f}"
    )

    print(
        f"V2 Macro F1: "
        f"{f1_mean:.4f}"
    )

    print(
        f"Macro F1 improvement: "
        f"{f1_improvement:+.4f}"
    )

    print()
    print("=" * 60)
    print("CROSS-VALIDATION COMPLETE")
    print("=" * 60)

    print(
        "\nThe 997-image test set "
        "was NOT used."
    )


if __name__ == "__main__":
    main()