from dataclasses import dataclass
from pathlib import Path

import cv2
import mediapipe as mp

from mediapipe.tasks import python
from mediapipe.tasks.python import vision


@dataclass
class LandmarkPoint:
    index: int
    x: float
    y: float
    z: float


class FaceLandmarkDetector:
    """
    MediaPipe Face Landmarker.

    Detects facial landmarks from a face image.
    """

    def __init__(
        self,
        model_path: str = "models/face/face_landmarker.task",
        num_faces: int = 1,
        min_face_detection_confidence: float = 0.5,
        min_face_presence_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ) -> None:

        model_file = Path(model_path)

        if not model_file.exists():
            raise FileNotFoundError(
                f"Face landmark model not found: {model_file.resolve()}"
            )

        base_options = python.BaseOptions(
            model_asset_path=str(model_file.resolve())
        )

        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_faces=num_faces,
            min_face_detection_confidence=min_face_detection_confidence,
            min_face_presence_confidence=min_face_presence_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )

        self.detector = vision.FaceLandmarker.create_from_options(
            options
        )

    def detect(self, image):

        if image is None or image.size == 0:
            raise ValueError("Invalid image.")

        rgb_image = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2RGB,
        )

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_image,
        )

        result = self.detector.detect(mp_image)

        if not result.face_landmarks:
            return []

        all_faces = []

        for face_landmarks in result.face_landmarks:

            landmarks = []

            for index, point in enumerate(face_landmarks):

                landmarks.append(
                    LandmarkPoint(
                        index=index,
                        x=float(point.x),
                        y=float(point.y),
                        z=float(point.z),
                    )
                )

            all_faces.append(landmarks)

        return all_faces

    def close(self):
        self.detector.close()