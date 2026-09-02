from pathlib import Path
from collections import Counter

import cv2


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_DIR = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "dataset"
)

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

CLASSES = [
    "heart",
    "oblong",
    "oval",
    "round",
    "square",
]


def inspect_split(split: str) -> dict:

    split_dir = DATASET_DIR / split

    results = {
        "total": 0,
        "valid": 0,
        "corrupt": 0,
        "small_images": 0,
        "classes": Counter(),
        "widths": [],
        "heights": [],
    }

    if not split_dir.exists():
        raise FileNotFoundError(
            f"Dataset split not found: {split_dir}"
        )

    for class_name in CLASSES:

        class_dir = split_dir / class_name

        if not class_dir.exists():
            print(
                f"WARNING: Missing class folder: {class_name}"
            )
            continue

        for image_path in class_dir.iterdir():

            if (
                not image_path.is_file()
                or image_path.suffix.lower()
                not in IMAGE_EXTENSIONS
            ):
                continue

            results["total"] += 1
            results["classes"][class_name] += 1

            image = cv2.imread(
                str(image_path)
            )

            if image is None:
                results["corrupt"] += 1
                continue

            results["valid"] += 1

            height, width = image.shape[:2]

            results["widths"].append(width)
            results["heights"].append(height)

            if width < 128 or height < 128:
                results["small_images"] += 1

    return results


def print_report(
    split: str,
    results: dict,
) -> None:

    print()
    print("=" * 60)
    print(f"{split.upper()} DATASET REPORT")
    print("=" * 60)

    print(
        f"Total images:   {results['total']}"
    )

    print(
        f"Valid images:   {results['valid']}"
    )

    print(
        f"Corrupt images: {results['corrupt']}"
    )

    print(
        f"Small images:   {results['small_images']}"
    )

    if results["widths"]:

        print(
            f"Min resolution: "
            f"{min(results['widths'])} x "
            f"{min(results['heights'])}"
        )

        print(
            f"Max resolution: "
            f"{max(results['widths'])} x "
            f"{max(results['heights'])}"
        )

    print()
    print("Class distribution:")

    for class_name in CLASSES:

        count = results["classes"][class_name]

        print(
            f"  {class_name:8} : {count}"
        )


def main() -> None:

    print("=" * 60)
    print("HAIRVISION AI")
    print("FACE SHAPE DATASET INSPECTION")
    print("=" * 60)

    print(
        f"\nDataset:\n{DATASET_DIR}"
    )

    print(
        "\nInspecting training dataset..."
    )

    train_results = inspect_split("train")

    print(
        "\nInspecting test dataset..."
    )

    test_results = inspect_split("test")

    print_report(
        "train",
        train_results,
    )

    print_report(
        "test",
        test_results,
    )

    print()
    print("=" * 60)
    print("INSPECTION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()