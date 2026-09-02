from __future__ import annotations

import math


# ============================================================
# HAIRVISION AI
# SHARED V2 FACE FEATURE EXTRACTOR
#
# IMPORTANT:
# This is the SAME feature engineering logic used for:
#     scripts\extract_face_shape_features_v2.py
#
# Both training and real-image prediction must use this
# function so the model receives identical features.
# ============================================================


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


FEATURE_NAMES = [
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


def point(landmarks, index: int):
    p = landmarks[index]

    return (
        float(p.x),
        float(p.y),
    )


def distance(a, b) -> float:

    return math.sqrt(
        (a[0] - b[0]) ** 2
        + (a[1] - b[1]) ** 2
    )


def angle(a, b, c) -> float:
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


def extract_features(landmarks) -> dict:
    """
    Convert MediaPipe 478 landmarks into
    the exact 21 V2 features.

    IMPORTANT:
    Do not change the feature order or formulas
    without retraining the model.
    """

    # --------------------------------------------------------
    # Key points
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Main dimensions
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Normalize measurements by face height
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Ratios
    # --------------------------------------------------------

    face_ratio = (
        face_height
        / max(
            face_width,
            1e-6,
        )
    )

    cheek_to_jaw_ratio = (
        cheek_width
        / max(
            jaw_width,
            1e-6,
        )
    )

    jaw_to_face_ratio = (
        jaw_width
        / max(
            face_width,
            1e-6,
        )
    )

    cheek_to_face_ratio = (
        cheek_width
        / max(
            face_width,
            1e-6,
        )
    )

    eye_to_face_ratio = (
        eye_distance
        / max(
            face_width,
            1e-6,
        )
    )

    mouth_to_face_ratio = (
        mouth_width
        / max(
            face_width,
            1e-6,
        )
    )

    brow_to_face_ratio = (
        brow_width
        / max(
            face_width,
            1e-6,
        )
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

    # --------------------------------------------------------
    # Jaw angle
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Eye opening
    # --------------------------------------------------------

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
        2.0
        * max(
            eye_distance,
            1e-6,
        )
    )

    # --------------------------------------------------------
    # Facial symmetry
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Return EXACT V2 feature dictionary
    # --------------------------------------------------------

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