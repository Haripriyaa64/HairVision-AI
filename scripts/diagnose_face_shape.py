from pathlib import Path

import cv2
import numpy as np
import pandas as pd


# ============================================================
# HAIRVISION AI
# FACE SHAPE FEATURE DIAGNOSTICS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

FEATURE_FILE = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "features"
    / "face_features_v2.csv"
)

IMAGE_FILE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "face"
    / "image.png"
)

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
# IMPORT EXISTING HAIRVISION PIPELINE
# ============================================================

from ai.face.detector import FaceDetector
from ai.face.landmarks import FaceLandmarkDetector

from scripts.predict_face_shape import (
    calculate_v2_features,
)


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("HAIRVISION AI")
    print("FACE SHAPE FEATURE DIAGNOSTICS")
    print("=" * 60)

    # ========================================================
    # LOAD DATASET
    # ========================================================

    print("\nLoading V2 feature dataset...")

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
        f"Training samples: {len(train_df)}"
    )

    # ========================================================
    # LOAD IMAGE
    # ========================================================

    print("\nLoading real image...")

    if not IMAGE_FILE.exists():

        raise FileNotFoundError(
            f"Image not found:\n{IMAGE_FILE}"
        )

    image = cv2.imread(
        str(IMAGE_FILE)
    )

    if image is None:

        raise RuntimeError(
            "Could not read image."
        )

    print(
        f"Image: {IMAGE_FILE}"
    )

    print(
        f"Size: "
        f"{image.shape[1]}x"
        f"{image.shape[0]}"
    )

    # ========================================================
    # FACE DETECTION
    # ========================================================

    print("\nDetecting face...")

    face_detector = FaceDetector()

    faces = face_detector.detect(
        image
    )

    if not faces:

        raise RuntimeError(
            "No face detected."
        )

    print(
        f"Faces detected: {len(faces)}"
    )

    # ========================================================
    # LANDMARKS
    # ========================================================

    print(
        "Detecting 478 landmarks..."
    )

    landmark_detector = (
        FaceLandmarkDetector()
    )

    landmark_faces = (
        landmark_detector.detect(
            image
        )
    )

    if not landmark_faces:

        raise RuntimeError(
            "No landmarks detected."
        )

    landmarks = landmark_faces[0]

    print(
        f"Landmarks detected: "
        f"{len(landmarks)}"
    )

    # ========================================================
    # FEATURE EXTRACTION
    # ========================================================

    print(
        "\nExtracting exact V2 features..."
    )

    feature_vector = (
        calculate_v2_features(
            image,
            landmarks,
        )
    )

    if len(feature_vector) != 21:

        raise RuntimeError(
            f"Expected 21 features, "
            f"got {len(feature_vector)}"
        )

    image_features = pd.Series(
        feature_vector,
        index=FEATURES,
        dtype=float,
    )

    # ========================================================
    # PRINT IMAGE FEATURES
    # ========================================================

    print("\n")
    print("=" * 60)
    print("YOUR IMAGE - 21 FEATURES")
    print("=" * 60)

    for feature in FEATURES:

        print(
            f"{feature:24} "
            f"{image_features[feature]:.6f}"
        )

    # ========================================================
    # CLASS STATISTICS
    # ========================================================

    classes_to_compare = [
        "oval",
        "oblong",
        "round",
        "heart",
        "square",
    ]

    # ========================================================
    # CLASS CENTROID DISTANCE
    # ========================================================

    print("\n")
    print("=" * 60)
    print("DISTANCE FROM CLASS CENTROIDS")
    print("=" * 60)

    distances = {}

    # Standardize using overall training distribution
    #
    # This prevents large-valued features such as
    # jaw_angle from dominating the comparison.

    overall_mean = train_df[
        FEATURES
    ].mean()

    overall_std = train_df[
        FEATURES
    ].std()

    overall_std = overall_std.replace(
        0,
        1,
    )

    image_z = (
        image_features
        - overall_mean
    ) / overall_std

    for class_name in classes_to_compare:

        class_df = train_df[
            train_df["label"]
            == class_name
        ]

        class_mean = class_df[
            FEATURES
        ].mean()

        class_z = (
            class_mean
            - overall_mean
        ) / overall_std

        distance = float(
            np.sqrt(
                np.mean(
                    (
                        image_z
                        - class_z
                    ) ** 2
                )
            )
        )

        distances[class_name] = (
            distance
        )

    sorted_distances = sorted(
        distances.items(),
        key=lambda x: x[1],
    )

    for class_name, distance in (
        sorted_distances
    ):

        print(
            f"{class_name:10} "
            f"distance = {distance:.4f}"
        )

    # ========================================================
    # FEATURE COMPARISON
    # ========================================================

    print("\n")
    print("=" * 60)
    print("OVAL vs OBLONG FEATURE COMPARISON")
    print("=" * 60)

    oval_df = train_df[
        train_df["label"] == "oval"
    ]

    oblong_df = train_df[
        train_df["label"] == "oblong"
    ]

    comparison = []

    for feature in FEATURES:

        image_value = float(
            image_features[
                feature
            ]
        )

        oval_mean = float(
            oval_df[feature].mean()
        )

        oblong_mean = float(
            oblong_df[feature].mean()
        )

        oval_std = float(
            oval_df[feature].std()
        )

        oblong_std = float(
            oblong_df[feature].std()
        )

        # Distance from each class mean,
        # normalized by class standard deviation.

        oval_z = abs(
            image_value - oval_mean
        ) / max(
            oval_std,
            1e-8,
        )

        oblong_z = abs(
            image_value - oblong_mean
        ) / max(
            oblong_std,
            1e-8,
        )

        if oval_z < oblong_z:

            closer_to = "OVAL"

        elif oblong_z < oval_z:

            closer_to = "OBLONG"

        else:

            closer_to = "EQUAL"

        comparison.append(
            {
                "feature": feature,
                "image": image_value,
                "oval_mean": oval_mean,
                "oblong_mean": oblong_mean,
                "oval_distance": oval_z,
                "oblong_distance": oblong_z,
                "closer_to": closer_to,
            }
        )

    comparison_df = pd.DataFrame(
        comparison
    )

    # Sort by how strongly the feature
    # separates the image toward one class.

    comparison_df["difference"] = (
        comparison_df[
            "oval_distance"
        ]
        - comparison_df[
            "oblong_distance"
        ]
    )

    comparison_df = comparison_df.sort_values(
        "difference"
    )

    print()

    print(
        f"{'FEATURE':24} "
        f"{'IMAGE':>10} "
        f"{'OVAL AVG':>10} "
        f"{'OBLONG AVG':>11} "
        f"{'CLOSER TO':>11}"
    )

    print("-" * 72)

    for _, row in comparison_df.iterrows():

        print(
            f"{row['feature']:24} "
            f"{row['image']:10.4f} "
            f"{row['oval_mean']:10.4f} "
            f"{row['oblong_mean']:11.4f} "
            f"{row['closer_to']:>11}"
        )

    # ========================================================
    # MOST IMPORTANT FEATURES
    # ========================================================

    print("\n")
    print("=" * 60)
    print("FEATURES PUSHING TOWARD OBLONG")
    print("=" * 60)

    oblong_features = (
        comparison_df[
            comparison_df["closer_to"]
            == "OBLONG"
        ]
        .copy()
    )

    oblong_features[
        "strength"
    ] = (
        oblong_features[
            "oval_distance"
        ]
        - oblong_features[
            "oblong_distance"
        ]
    )

    oblong_features = (
        oblong_features.sort_values(
            "strength",
            ascending=False,
        )
    )

    if len(oblong_features) == 0:

        print(
            "\nNo feature strongly favors Oblong."
        )

    else:

        for _, row in (
            oblong_features.head(10)
            .iterrows()
        ):

            print(
                f"{row['feature']:24} "
                f"strength="
                f"{row['strength']:.3f}"
            )

    # ========================================================
    # MOST IMPORTANT FEATURES
    # ========================================================

    print("\n")
    print("=" * 60)
    print("FEATURES PUSHING TOWARD OVAL")
    print("=" * 60)

    oval_features = (
        comparison_df[
            comparison_df["closer_to"]
            == "OVAL"
        ]
        .copy()
    )

    oval_features[
        "strength"
    ] = (
        oval_features[
            "oblong_distance"
        ]
        - oval_features[
            "oval_distance"
        ]
    )

    oval_features = (
        oval_features.sort_values(
            "strength",
            ascending=False,
        )
    )

    if len(oval_features) == 0:

        print(
            "\nNo feature strongly favors Oval."
        )

    else:

        for _, row in (
            oval_features.head(10)
            .iterrows()
        ):

            print(
                f"{row['feature']:24} "
                f"strength="
                f"{row['strength']:.3f}"
            )

    # ========================================================
    # CLASS STATISTICS
    # ========================================================

    print("\n")
    print("=" * 60)
    print("CLASS FACE-RATIO STATISTICS")
    print("=" * 60)

    for class_name in classes_to_compare:

        class_df = train_df[
            train_df["label"]
            == class_name
        ]

        print(
            f"\n{class_name.upper()}"
        )

        for feature in [
            "face_ratio",
            "cheek_to_jaw_ratio",
            "jaw_to_face_ratio",
            "upper_face_ratio",
            "lower_face_ratio",
            "jaw_angle",
        ]:

            print(
                f"  {feature:24} "
                f"mean="
                f"{class_df[feature].mean():.4f} "
                f"std="
                f"{class_df[feature].std():.4f}"
            )

    # ========================================================
    # COMPLETE
    # ========================================================

    print("\n")
    print("=" * 60)
    print("DIAGNOSTICS COMPLETE")
    print("=" * 60)

    print(
        "\nIMPORTANT:"
    )

    print(
        "This diagnostic does NOT modify "
        "the model or dataset."
    )

    print(
        "The 997-image locked test set "
        "was NOT used."
    )


if __name__ == "__main__":
    main()