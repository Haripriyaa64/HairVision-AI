from pathlib import Path
import random

import cv2
import matplotlib.pyplot as plt


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_DIR = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "dataset"
    / "train"
)

CLASSES = [
    "heart",
    "oblong",
    "oval",
    "round",
    "square",
]

IMAGES_PER_CLASS = 5


def load_images(class_name: str):

    class_dir = DATASET_DIR / class_name

    images = [
        p
        for p in class_dir.iterdir()
        if p.suffix.lower() in {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
        }
    ]

    random.shuffle(images)

    return images[:IMAGES_PER_CLASS]


def main():

    print("Creating face-shape visual audit...")

    fig, axes = plt.subplots(
        len(CLASSES),
        IMAGES_PER_CLASS,
        figsize=(15, 15),
    )

    for row, class_name in enumerate(CLASSES):

        images = load_images(class_name)

        for col in range(IMAGES_PER_CLASS):

            ax = axes[row][col]

            if col >= len(images):
                ax.axis("off")
                continue

            image_path = images[col]

            image = cv2.imread(
                str(image_path)
            )

            if image is None:
                ax.axis("off")
                continue

            image = cv2.cvtColor(
                image,
                cv2.COLOR_BGR2RGB,
            )

            ax.imshow(image)

            ax.set_title(
                class_name.upper()
            )

            ax.axis("off")

    plt.tight_layout()

    output_dir = PROJECT_ROOT / "outputs"

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path = (
        output_dir
        / "face_shape_dataset_audit.png"
    )

    plt.savefig(
        output_path,
        dpi=150,
        bbox_inches="tight",
    )

    print(
        f"\nSaved audit image:\n{output_path}"
    )

    plt.show()


if __name__ == "__main__":
    main()