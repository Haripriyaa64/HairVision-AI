from pathlib import Path
import json

import pandas as pd

from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV
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

OUTPUT_DIR = (
    PROJECT_ROOT
    / "models"
    / "face_shape"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# CONFIGURATION
# ============================================================

RANDOM_STATE = 42

N_ITER = 30

CV_FOLDS = 5


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("XGBOOST HYPERPARAMETER TUNING")
    print("=" * 60)

    # --------------------------------------------------------
    # Load dataset
    # --------------------------------------------------------

    print("\nLoading V2 feature dataset...")

    df = pd.read_csv(DATA_FILE)

    # IMPORTANT:
    # The locked test set is NEVER used here.
    train_df = df[
        df["split"] == "train"
    ].copy()

    print(
        f"Training samples: {len(train_df)}"
    )

    # --------------------------------------------------------
    # Select features
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Encode labels
    # --------------------------------------------------------

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
        f"Features: {len(feature_columns)}"
    )

    print(
        "\nClasses:"
    )

    for label, value in label_map.items():
        print(
            f"  {value}: {label}"
        )

    # --------------------------------------------------------
    # Base XGBoost model
    # --------------------------------------------------------

    model = XGBClassifier(
        objective="multi:softprob",
        num_class=5,

        eval_metric="mlogloss",

        random_state=RANDOM_STATE,

        n_jobs=-1,
    )

    # --------------------------------------------------------
    # Hyperparameter search space
    # --------------------------------------------------------

    param_distributions = {

        "n_estimators": [
            100,
            200,
            300,
            400,
            500,
            600,
        ],

        "max_depth": [
            2,
            3,
            4,
            5,
            6,
            7,
            8,
        ],

        "learning_rate": [
            0.01,
            0.03,
            0.05,
            0.08,
            0.1,
            0.15,
            0.2,
        ],

        "min_child_weight": [
            1,
            2,
            3,
            5,
            7,
            10,
        ],

        "subsample": [
            0.7,
            0.8,
            0.9,
            1.0,
        ],

        "colsample_bytree": [
            0.7,
            0.8,
            0.9,
            1.0,
        ],

        "gamma": [
            0,
            0.01,
            0.05,
            0.1,
            0.2,
            0.5,
        ],

        "reg_alpha": [
            0,
            0.001,
            0.01,
            0.1,
            0.5,
        ],

        "reg_lambda": [
            0.5,
            1,
            1.5,
            2,
            5,
        ],
    }

    # --------------------------------------------------------
    # Stratified CV
    # --------------------------------------------------------

    cv = StratifiedKFold(
        n_splits=CV_FOLDS,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    # --------------------------------------------------------
    # Randomized search
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("STARTING RANDOMIZED SEARCH")
    print("=" * 60)

    print(
        f"\nParameter combinations tested: {N_ITER}"
    )

    print(
        f"Cross-validation folds: {CV_FOLDS}"
    )

    print(
        "\nOptimization metric: Macro F1"
    )

    search = RandomizedSearchCV(
        estimator=model,

        param_distributions=param_distributions,

        n_iter=N_ITER,

        scoring="f1_macro",

        cv=cv,

        verbose=2,

        random_state=RANDOM_STATE,

        n_jobs=-1,

        return_train_score=False,
    )

    # --------------------------------------------------------
    # Train
    # --------------------------------------------------------

    search.fit(
        X,
        y,
    )

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("HYPERPARAMETER TUNING COMPLETE")
    print("=" * 60)

    print(
        "\nBest Macro F1:"
    )

    print(
        f"{search.best_score_:.4f}"
    )

    print(
        "\nBest parameters:"
    )

    for parameter, value in search.best_params_.items():

        print(
            f"  {parameter}: {value}"
        )

    # --------------------------------------------------------
    # Compare with previous V2 model
    # --------------------------------------------------------

    previous_v2_f1 = 0.5399

    improvement = (
        search.best_score_
        - previous_v2_f1
    )

    print()
    print("=" * 60)
    print("PREVIOUS V2 vs TUNED MODEL")
    print("=" * 60)

    print(
        f"\nPrevious V2 Macro F1:"
        f" {previous_v2_f1:.4f}"
    )

    print(
        f"Tuned Macro F1:"
        f" {search.best_score_:.4f}"
    )

    print(
        f"Improvement:"
        f" {improvement:+.4f}"
    )

    # --------------------------------------------------------
    # Save best model
    # --------------------------------------------------------

    model_path = (
        OUTPUT_DIR
        / "xgboost_tuned.joblib"
    )

    import joblib

    joblib.dump(
        search.best_estimator_,
        model_path,
    )

    print(
        "\nBest model saved to:"
    )

    print(
        model_path
    )

    # --------------------------------------------------------
    # Save tuning metadata
    # --------------------------------------------------------

    metadata = {

        "model": "XGBoost",

        "feature_version": "V2",

        "training_samples": len(train_df),

        "features": feature_columns,

        "cv_folds": CV_FOLDS,

        "search_iterations": N_ITER,

        "scoring": "f1_macro",

        "best_macro_f1": float(
            search.best_score_
        ),

        "previous_v2_macro_f1": previous_v2_f1,

        "improvement": float(
            improvement
        ),

        "best_parameters": {
            key: (
                int(value)
                if isinstance(value, int)
                else float(value)
                if isinstance(value, float)
                else value
            )
            for key, value
            in search.best_params_.items()
        },
    }

    metadata_path = (
        OUTPUT_DIR
        / "xgboost_tuning_metadata.json"
    )

    with metadata_path.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            indent=2,
        )

    print(
        "\nTuning metadata saved to:"
    )

    print(
        metadata_path
    )

    print()
    print("=" * 60)
    print("IMPORTANT")
    print("=" * 60)

    print(
        "\nThe 997-image locked test set "
        "was NOT used."
    )

    print(
        "\nNext step:"
    )

    print(
        "Evaluate the tuned model on the "
        "locked 997-image test set."
    )


if __name__ == "__main__":
    main()