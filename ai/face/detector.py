from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


@dataclass
class FaceDetection:
    x: int
    y: int
    width: int
    height: int
    confidence: float

    @property
    def bbox(self) -> tuple[int, int, int, int]:
        return self.x, self.y, self.width, self.height


class FaceDetector:
    """
    Baseline face detector using OpenCV Haar Cascade.

    This is intentionally our first baseline.
    Later we will benchmark a modern face detector
    against this implementation.
    """

    def __init__(self) -> None:
        cascade_path = Path(
            cv2.data.haarcascades
        ) / "haarcascade_frontalface_default.xml"

        if not cascade_path.exists():
            raise FileNotFoundError(
                f"OpenCV Haar Cascade not found: {cascade_path}"
            )

        self.detector = cv2.CascadeClassifier(
            str(cascade_path)
        )

        if self.detector.empty():
            raise RuntimeError(
                f"Failed to load face detector: {cascade_path}"
            )

    def detect(
        self,
        image: np.ndarray,
    ) -> list[FaceDetection]:

        if image is None or image.size == 0:
            raise ValueError("Invalid image.")

        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

        gray = cv2.equalizeHist(gray)

        faces = self.detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(80, 80),
        )

        detections: list[FaceDetection] = []

        for x, y, width, height in faces:
            detections.append(
                FaceDetection(
                    x=int(x),
                    y=int(y),
                    width=int(width),
                    height=int(height),
                    confidence=1.0,
                )
            )

        return detections


def draw_detections(
    image: np.ndarray,
    detections: list[FaceDetection],
) -> np.ndarray:

    output = image.copy()

    for face in detections:
        x, y, width, height = face.bbox

        cv2.rectangle(
            output,
            (x, y),
            (x + width, y + height),
            (0, 255, 0),
            2,
        )

        cv2.putText(
            output,
            "Face",
            (x, max(y - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )

    return output