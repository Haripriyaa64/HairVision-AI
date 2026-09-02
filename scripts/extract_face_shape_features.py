from pathlib import Path
import csv

import cv2

from ai.face.landmarks import FaceLandmarkDetector
from ai.face.features import calculate_face_features


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

OUTPUT_FILE = OUTPUT_DIR / "face_features.csv"

CLASSES = [
    "heart",
    "oblong",
    "oval",
    "round",
    "square",
]

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


def process_image(
    image_path: Path,
    detector: FaceLandmarkDetector,
):
    image = cv2.imread(str(image_path))

    if image is None:
        return None, "image_read_failed"

    landmarks = detector.detect(image)

    if not landmarks:
        return None, "no_face"

    try:
        features = calculate_face_features(
            landmarks[0]
        )
    except Exception as exc:
        return None, f"feature_error_{type(exc).__name__}"

    return features, None


def main():

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    detector = FaceLandmarkDetector()

    rows = []
    failures = []

    total = 0
    successful = 0

    for split in ["train", "test"]:

        print()
        print("=" * 60)
        print(f"Processing {split.upper()} dataset")
        print("=" * 60)

        split_dir = DATASET_DIR / split

        for class_name in CLASSES:

            class_dir = split_dir / class_name

            images = [
                path
                for path in class_dir.iterdir()
                if path.is_file()
                and path.suffix.lower()
                in IMAGE_EXTENSIONS
            ]

            print(
                f"\n{class_name}: {len(images)} images"
            )

            for index, image_path in enumerate(
                images,
                start=1,
            ):

                total += 1

                features, error = process_image(
                    image_path,
                    detector,
                )

                if error:

                    failures.append(
                        {
                            "split": split,
                            "class": class_name,
                            "image": str(
                                image_path.relative_to(
                                    PROJECT_ROOT
                                )
                            ),
                            "error": error,
                        }
                    )

                    continue

                row = {
                    "split": split,
                    "image": str(
                        image_path.relative_to(
                            PROJECT_ROOT
                        )
                    ),
                    "label": class_name,
                }

                row.update(features)

                rows.append(row)

                successful += 1

                if index % 50 == 0:
                    print(
                        f"  processed {index}/{len(images)}"
                    )

    if not rows:
        raise RuntimeError(
            "No features were generated."
        )

    fieldnames = list(rows[0].keys())

    with OUTPUT_FILE.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)

    failure_file = (
        OUTPUT_DIR
        / "feature_extraction_failures.csv"
    )

    if failures:

        failure_fields = [
            "split",
            "class",
            "image",
            "error",
        ]

        with failure_file.open(
            "w",
            newline="",
            encoding="utf-8",
        ) as file:

            writer = csv.DictWriter(
                file,
                fieldnames=failure_fields,
            )

            writer.writeheader()
            writer.writerows(failures)

    print()
    print("=" * 60)
    print("FEATURE EXTRACTION COMPLETE")
    print("=" * 60)

    print(f"Total images:       {total}")
    print(f"Successful:         {successful}")
    print(f"Failed:             {len(failures)}")

    print(
        f"\nFeature dataset:\n{OUTPUT_FILE}"
    )

    if failures:
        print(
            f"\nFailure report:\n{failure_file}"
        )


if __name__ == "__main__":
    main()