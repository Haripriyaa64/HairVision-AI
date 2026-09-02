from pathlib import Path

import cv2

from ai.face.detector import FaceDetector, draw_detections
from ai.face.features import calculate_face_features
from ai.face.landmarks import FaceLandmarkDetector


INPUT_DIR = Path("data/raw/face")
OUTPUT_DIR = Path("outputs")

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


def main() -> None:
    image_files = [
        path
        for path in INPUT_DIR.iterdir()
        if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    ]

    if not image_files:
        print(
            f"No images found in {INPUT_DIR.resolve()}"
        )
        return

    face_detector = FaceDetector()
    landmark_detector = FaceLandmarkDetector()

    try:
        for image_path in image_files:
            print("=" * 60)
            print(f"Processing: {image_path.name}")

            image = cv2.imread(
                str(image_path)
            )

            if image is None:
                print("Could not read image.")
                continue

            faces = face_detector.detect(image)

            print(
                f"Faces detected: {len(faces)}"
            )

            if not faces:
                print("No face detected.")
                continue

            landmark_faces = landmark_detector.detect(
                image
            )

            print(
                f"Landmark faces: {len(landmark_faces)}"
            )

            if not landmark_faces:
                print("No facial landmarks detected.")
                continue

            landmarks = landmark_faces[0]

            print(
                f"Landmarks detected: {len(landmarks)}"
            )

            features = calculate_face_features(
                landmarks
            )

            print("\nFace features:")

            for name, value in features.items():
                print(
                    f"  {name}: {value:.4f}"
                )

            output = draw_detections(
                image,
                faces,
            )

            output_path = (
                OUTPUT_DIR
                / f"{image_path.stem}_detected.jpg"
            )

            cv2.imwrite(
                str(output_path),
                output,
            )

            print(
                f"\nSaved: {output_path}"
            )

    finally:
        landmark_detector.close()


if __name__ == "__main__":
    main()