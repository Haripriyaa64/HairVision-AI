from pathlib import Path
import shutil


SOURCE = Path(
    r"C:\Users\GAYATRI\.cache\kagglehub\datasets"
    r"\zeyadkhalid\faceshape-processed\versions\1\dataset"
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DESTINATION = (
    PROJECT_ROOT
    / "data"
    / "face_shape"
    / "dataset"
)


CLASSES = [
    "Heart",
    "Oblong",
    "Oval",
    "Round",
    "Square",
]


def copy_split(split: str) -> None:

    source_split = SOURCE / split
    destination_split = DESTINATION / split

    if not source_split.exists():
        raise FileNotFoundError(
            f"Source split not found: {source_split}"
        )

    for class_name in CLASSES:

        source_class = source_split / class_name
        destination_class = (
            destination_split / class_name.lower()
        )

        if not source_class.exists():
            raise FileNotFoundError(
                f"Class not found: {source_class}"
            )

        destination_class.mkdir(
            parents=True,
            exist_ok=True,
        )

        files = [
            file
            for file in source_class.iterdir()
            if file.is_file()
        ]

        print(
            f"{split:5} | "
            f"{class_name:8} | "
            f"{len(files):4} images"
        )

        for file in files:

            destination_file = (
                destination_class / file.name
            )

            shutil.copy2(
                file,
                destination_file,
            )


def main() -> None:

    print("=" * 60)
    print("Preparing Face Shape Dataset")
    print("=" * 60)

    if not SOURCE.exists():
        raise FileNotFoundError(
            f"Dataset not found:\n{SOURCE}"
        )

    copy_split("train")
    copy_split("test")

    print("\nDataset preparation complete.")

    print(
        f"\nSaved to:\n{DESTINATION}"
    )


if __name__ == "__main__":
    main()