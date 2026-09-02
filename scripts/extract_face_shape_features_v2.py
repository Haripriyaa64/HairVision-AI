from pathlib import Path
import math

import cv2
import pandas as pd

from ai.face.landmarks import FaceLandmarkDetector


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_DIR = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "dataset"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "features"
)

OUTPUT_FILE = (
    OUTPUT_DIR
    / "face_features_v2.csv"
)


CLASSES = [
    "heart",
    "oblong",
    "oval",
    "round",
    "square",
]


# MediaPipe landmark indices
NOSE_TIP = 1
CHIN = 152

LEFT_EYE_OUTER = 33
RIGHT_EYE_OUTER = 263

LEFT_CHEEK = 234
RIGHT_CHEEK = 454

LEFT_JAW = 172
RIGHT_JAW = 397

LEFT_MOUTH = 61
RIGHT_MOUTH = 291

LEFT_BROW = 70
RIGHT_BROW = 300

FOREHEAD = 10

LEFT_EYE_TOP = 159
RIGHT_EYE_TOP = 386

LEFT_EYE_BOTTOM = 145
RIGHT_EYE_BOTTOM = 374


def point(landmarks, index):
    p = landmarks[index]

    return (
        float(p.x),
        float(p.y),
    )


def distance(a, b):
    return math.sqrt(
        (a[0] - b[0]) ** 2
        + (a[1] - b[1]) ** 2
    )


def angle(a, b, c):
    """
    Angle ABC in degrees.
    """

    ba = (
        a[0] - b[0],
        a[1] - b[1],
    )

    bc = (
        c[0] - b[0],
        c[1] - b[1],
    )

    dot = (
        ba[0] * bc[0]
        + ba[1] * bc[1]
    )

    mag_ba = math.sqrt(
        ba[0] ** 2
        + ba[1] ** 2
    )

    mag_bc = math.sqrt(
        bc[0] ** 2
        + bc[1] ** 2
    )

    if mag_ba == 0 or mag_bc == 0:
        return 0.0

    value = dot / (
        mag_ba * mag_bc
    )

    value = max(
        -1.0,
        min(1.0, value),
    )

    return math.degrees(
        math.acos(value)
    )


def extract_features(landmarks):
    """
    Convert MediaPipe landmarks into
    normalized facial geometry features.
    """

    # ---------------------------------------------------------
    # Key points
    # ---------------------------------------------------------

    nose = point(
        landmarks,
        NOSE_TIP,
    )

    chin = point(
        landmarks,
        CHIN,
    )

    forehead = point(
        landmarks,
        FOREHEAD,
    )

    left_cheek = point(
        landmarks,
        LEFT_CHEEK,
    )

    right_cheek = point(
        landmarks,
        RIGHT_CHEEK,
    )

    left_jaw = point(
        landmarks,
        LEFT_JAW,
    )

    right_jaw = point(
        landmarks,
        RIGHT_JAW,
    )

    left_eye = point(
        landmarks,
        LEFT_EYE_OUTER,
    )

    right_eye = point(
        landmarks,
        RIGHT_EYE_OUTER,
    )

    left_mouth = point(
        landmarks,
        LEFT_MOUTH,
    )

    right_mouth = point(
        landmarks,
        RIGHT_MOUTH,
    )

    left_brow = point(
        landmarks,
        LEFT_BROW,
    )

    right_brow = point(
        landmarks,
        RIGHT_BROW,
    )

    left_eye_top = point(
        landmarks,
        LEFT_EYE_TOP,
    )

    left_eye_bottom = point(
        landmarks,
        LEFT_EYE_BOTTOM,
    )

    right_eye_top = point(
        landmarks,
        RIGHT_EYE_TOP,
    )

    right_eye_bottom = point(
        landmarks,
        RIGHT_EYE_BOTTOM,
    )

    # ---------------------------------------------------------
    # Main dimensions
    # ---------------------------------------------------------

    face_height = distance(
        forehead,
        chin,
    )

    face_width = distance(
        left_cheek,
        right_cheek,
    )

    cheek_width = distance(
        left_cheek,
        right_cheek,
    )

    jaw_width = distance(
        left_jaw,
        right_jaw,
    )

    eye_distance = distance(
        left_eye,
        right_eye,
    )

    mouth_width = distance(
        left_mouth,
        right_mouth,
    )

    brow_width = distance(
        left_brow,
        right_brow,
    )

    nose_to_chin = distance(
        nose,
        chin,
    )

    forehead_to_nose = distance(
        forehead,
        nose,
    )

    forehead_to_chin = distance(
        forehead,
        chin,
    )

    # ---------------------------------------------------------
    # Normalize all measurements by face height
    # ---------------------------------------------------------

    normalization = max(
        face_height,
        1e-6,
    )

    face_width_n = (
        face_width / normalization
    )

    cheek_width_n = (
        cheek_width / normalization
    )

    jaw_width_n = (
        jaw_width / normalization
    )

    eye_distance_n = (
        eye_distance / normalization
    )

    mouth_width_n = (
        mouth_width / normalization
    )

    brow_width_n = (
        brow_width / normalization
    )

    nose_to_chin_n = (
        nose_to_chin / normalization
    )

    forehead_to_nose_n = (
        forehead_to_nose / normalization
    )

    # ---------------------------------------------------------
    # Ratios
    # ---------------------------------------------------------

    face_ratio = (
        face_height / max(
            face_width,
            1e-6,
        )
    )

    cheek_to_jaw_ratio = (
        cheek_width
        / max(jaw_width, 1e-6)
    )

    jaw_to_face_ratio = (
        jaw_width
        / max(face_width, 1e-6)
    )

    cheek_to_face_ratio = (
        cheek_width
        / max(face_width, 1e-6)
    )

    eye_to_face_ratio = (
        eye_distance
        / max(face_width, 1e-6)
    )

    mouth_to_face_ratio = (
        mouth_width
        / max(face_width, 1e-6)
    )

    brow_to_face_ratio = (
        brow_width
        / max(face_width, 1e-6)
    )

    upper_face_ratio = (
        forehead_to_nose
        / max(
            face_height,
            1e-6,
        )
    )

    lower_face_ratio = (
        nose_to_chin
        / max(
            face_height,
            1e-6,
        )
    )

    # ---------------------------------------------------------
    # Jaw angle
    # ---------------------------------------------------------

    jaw_angle_left = angle(
        left_cheek,
        left_jaw,
        chin,
    )

    jaw_angle_right = angle(
        right_cheek,
        right_jaw,
        chin,
    )

    jaw_angle = (
        jaw_angle_left
        + jaw_angle_right
    ) / 2.0

    # ---------------------------------------------------------
    # Eye opening
    # ---------------------------------------------------------

    left_eye_height = distance(
        left_eye_top,
        left_eye_bottom,
    )

    right_eye_height = distance(
        right_eye_top,
        right_eye_bottom,
    )

    eye_opening = (
        left_eye_height
        + right_eye_height
    ) / (
        2.0 * max(
            eye_distance,
            1e-6,
        )
    )

    # ---------------------------------------------------------
    # Facial symmetry
    # ---------------------------------------------------------

    left_cheek_distance = distance(
        forehead,
        left_cheek,
    )

    right_cheek_distance = distance(
        forehead,
        right_cheek,
    )

    symmetry_difference = abs(
        left_cheek_distance
        - right_cheek_distance
    )

    symmetry_score = 1.0 / (
        1.0
        + symmetry_difference
    )

    # ---------------------------------------------------------
    # Return feature vector
    # ---------------------------------------------------------

    return {
        "face_height": face_height,
        "face_width": face_width_n,
        "cheek_width": cheek_width_n,
        "jaw_width": jaw_width_n,
        "eye_distance": eye_distance_n,
        "mouth_width": mouth_width_n,
        "brow_width": brow_width_n,
        "nose_to_chin": nose_to_chin_n,
        "forehead_to_nose": forehead_to_nose_n,

        "face_ratio": face_ratio,
        "cheek_to_jaw_ratio": cheek_to_jaw_ratio,
        "jaw_to_face_ratio": jaw_to_face_ratio,
        "cheek_to_face_ratio": cheek_to_face_ratio,
        "eye_to_face_ratio": eye_to_face_ratio,
        "mouth_to_face_ratio": mouth_to_face_ratio,
        "brow_to_face_ratio": brow_to_face_ratio,

        "upper_face_ratio": upper_face_ratio,
        "lower_face_ratio": lower_face_ratio,

        "jaw_angle": jaw_angle,
        "eye_opening": eye_opening,
        "symmetry_score": symmetry_score,
    }


def process_dataset():
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    detector = FaceLandmarkDetector()

    rows = []

    total = 0
    successful = 0
    failed = 0

    for split in ["train", "test"]:

        print()
        print("=" * 60)
        print(
            f"PROCESSING {split.upper()}"
        )
        print("=" * 60)

        for class_name in CLASSES:

            class_dir = (
                DATASET_DIR
                / split
                / class_name
            )

            images = sorted(
                [
                    p
                    for p in class_dir.iterdir()
                    if p.is_file()
                    and p.suffix.lower()
                    in {
                        ".jpg",
                        ".jpeg",
                        ".png",
                        ".webp",
                    }
                ]
            )

            print(
                f"{class_name}: "
                f"{len(images)} images"
            )

            for index, image_path in enumerate(
                images,
                start=1,
            ):

                total += 1

                image = cv2.imread(
                    str(image_path)
                )

                if image is None:
                    failed += 1
                    continue

                landmark_faces = detector.detect(
                    image
                )

                if not landmark_faces:
                    failed += 1
                    continue

                landmarks = landmark_faces[0]

                try:
                    features = extract_features(
                        landmarks
                    )

                    row = {
                        "split": split,
                        "image": str(
                            image_path.relative_to(
                                PROJECT_ROOT
                            )
                        ),
                        "label": class_name,
                    }

                    row.update(
                        features
                    )

                    rows.append(row)

                    successful += 1

                except Exception:
                    failed += 1

                if index % 50 == 0:
                    print(
                        f"  processed "
                        f"{index}/{len(images)}"
                    )

    if not rows:
        raise RuntimeError(
            "No V2 features were generated."
        )

    df = pd.DataFrame(rows)

    df.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    print()
    print("=" * 60)
    print("FEATURE ENGINEERING V2 COMPLETE")
    print("=" * 60)

    print(
        f"Total images:  {total}"
    )

    print(
        f"Successful:    {successful}"
    )

    print(
        f"Failed:        {failed}"
    )

    print(
        f"Features:      {len(df.columns) - 3}"
    )

    print()
    print(
        f"Saved to:\n{OUTPUT_FILE}"
    )


if __name__ == "__main__":
    process_dataset()