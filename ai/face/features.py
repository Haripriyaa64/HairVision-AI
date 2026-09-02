from math import atan2, degrees, hypot

from ai.face.landmarks import LandmarkPoint


def distance(a: LandmarkPoint, b: LandmarkPoint) -> float:
    """Euclidean distance between two facial landmarks."""
    return hypot(a.x - b.x, a.y - b.y)


def angle(
    a: LandmarkPoint,
    b: LandmarkPoint,
    c: LandmarkPoint,
) -> float:
    """
    Calculates angle ABC in degrees.
    """

    ba_x = a.x - b.x
    ba_y = a.y - b.y

    bc_x = c.x - b.x
    bc_y = c.y - b.y

    dot = ba_x * bc_x + ba_y * bc_y

    magnitude_ba = hypot(ba_x, ba_y)
    magnitude_bc = hypot(bc_x, bc_y)

    if magnitude_ba == 0 or magnitude_bc == 0:
        return 0.0

    cosine = dot / (magnitude_ba * magnitude_bc)

    cosine = max(-1.0, min(1.0, cosine))

    from math import acos

    return degrees(acos(cosine))


def calculate_face_features(
    landmarks: list[LandmarkPoint],
) -> dict[str, float]:

    if len(landmarks) < 478:
        raise ValueError(
            f"Expected 478 landmarks, got {len(landmarks)}"
        )

    def p(index: int) -> LandmarkPoint:
        return landmarks[index]

    # --------------------------------------------------
    # Important MediaPipe landmark indices
    # --------------------------------------------------

    # Face vertical points
    forehead = p(10)
    chin = p(152)

    # Face horizontal points
    left_face = p(234)
    right_face = p(454)

    # Cheeks
    left_cheek = p(93)
    right_cheek = p(323)

    # Jaw
    left_jaw = p(172)
    right_jaw = p(397)

    # Chin / jaw region
    left_chin = p(150)
    right_chin = p(379)

    # Nose
    nose = p(1)

    # Eyes
    left_eye = p(33)
    right_eye = p(263)

    # --------------------------------------------------
    # Basic distances
    # --------------------------------------------------

    face_height = distance(
        forehead,
        chin,
    )

    face_width = distance(
        left_face,
        right_face,
    )

    cheek_width = distance(
        left_cheek,
        right_cheek,
    )

    jaw_width = distance(
        left_jaw,
        right_jaw,
    )

    chin_width = distance(
        left_chin,
        right_chin,
    )

    eye_distance = distance(
        left_eye,
        right_eye,
    )

    # --------------------------------------------------
    # Normalized ratios
    # --------------------------------------------------

    def safe_ratio(
        numerator: float,
        denominator: float,
    ) -> float:

        if denominator == 0:
            return 0.0

        return numerator / denominator

    face_ratio = safe_ratio(
        face_height,
        face_width,
    )

    cheek_ratio = safe_ratio(
        cheek_width,
        face_width,
    )

    jaw_ratio = safe_ratio(
        jaw_width,
        face_width,
    )

    chin_ratio = safe_ratio(
        chin_width,
        face_width,
    )

    eye_ratio = safe_ratio(
        eye_distance,
        face_width,
    )

    cheek_to_jaw_ratio = safe_ratio(
        cheek_width,
        jaw_width,
    )

    # --------------------------------------------------
    # Jaw angle
    # --------------------------------------------------

    jaw_angle = angle(
        left_jaw,
        chin,
        right_jaw,
    )

    # --------------------------------------------------
    # Nose position
    # --------------------------------------------------

    nose_vertical_ratio = safe_ratio(
        nose.y - forehead.y,
        face_height,
    )

    # --------------------------------------------------
    # Final ML feature vector
    # --------------------------------------------------

    return {
        "face_height": face_height,
        "face_width": face_width,
        "cheek_width": cheek_width,
        "jaw_width": jaw_width,
        "chin_width": chin_width,
        "eye_distance": eye_distance,

        "face_ratio": face_ratio,
        "cheek_ratio": cheek_ratio,
        "jaw_ratio": jaw_ratio,
        "chin_ratio": chin_ratio,
        "eye_ratio": eye_ratio,
        "cheek_to_jaw_ratio": cheek_to_jaw_ratio,

        "jaw_angle": jaw_angle,
        "nose_vertical_ratio": nose_vertical_ratio,
    }