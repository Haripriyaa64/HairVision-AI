from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class QualityResult:
    is_acceptable: bool
    width: int
    height: int
    brightness: float
    blur_score: float
    reasons: list[str]


class ImageQualityChecker:
    """
    Performs basic image-quality validation before
    the image enters the face-analysis pipeline.
    """

    def __init__(
        self,
        min_width: int = 256,
        min_height: int = 256,
        min_brightness: float = 35.0,
        max_brightness: float = 240.0,
        min_blur_score: float = 50.0,
    ) -> None:

        self.min_width = min_width
        self.min_height = min_height
        self.min_brightness = min_brightness
        self.max_brightness = max_brightness
        self.min_blur_score = min_blur_score

    def check(
        self,
        image: np.ndarray,
    ) -> QualityResult:

        if image is None or image.size == 0:
            return QualityResult(
                is_acceptable=False,
                width=0,
                height=0,
                brightness=0.0,
                blur_score=0.0,
                reasons=["Invalid or empty image."],
            )

        height, width = image.shape[:2]

        reasons: list[str] = []

        # -----------------------------------------
        # 1. Resolution
        # -----------------------------------------

        if width < self.min_width:
            reasons.append(
                f"Image width is too small ({width}px)."
            )

        if height < self.min_height:
            reasons.append(
                f"Image height is too small ({height}px)."
            )

        # -----------------------------------------
        # 2. Brightness
        # -----------------------------------------

        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

        brightness = float(
            np.mean(gray)
        )

        if brightness < self.min_brightness:
            reasons.append(
                "Image is too dark."
            )

        if brightness > self.max_brightness:
            reasons.append(
                "Image is overexposed."
            )

        # -----------------------------------------
        # 3. Blur detection
        # -----------------------------------------

        blur_score = float(
            cv2.Laplacian(
                gray,
                cv2.CV_64F,
            ).var()
        )

        if blur_score < self.min_blur_score:
            reasons.append(
                "Image appears too blurry."
            )

        return QualityResult(
            is_acceptable=len(reasons) == 0,
            width=width,
            height=height,
            brightness=brightness,
            blur_score=blur_score,
            reasons=reasons,
        )