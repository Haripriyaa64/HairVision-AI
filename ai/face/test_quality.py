from pathlib import Path

import cv2

from ai.face.quality import ImageQualityChecker


IMAGE_PATH = Path("data/raw/face/image.png")


def main() -> None:

    image = cv2.imread(
        str(IMAGE_PATH)
    )

    if image is None:
        print(
            f"Could not read: {IMAGE_PATH}"
        )
        return

    checker = ImageQualityChecker()

    result = checker.check(image)

    print("=" * 50)
    print("IMAGE QUALITY REPORT")
    print("=" * 50)

    print(
        f"Resolution: {result.width} x {result.height}"
    )

    print(
        f"Brightness: {result.brightness:.2f}"
    )

    print(
        f"Blur score: {result.blur_score:.2f}"
    )

    print(
        f"Acceptable: {result.is_acceptable}"
    )

    if result.reasons:
        print("\nProblems:")

        for reason in result.reasons:
            print(f"  - {reason}")

    else:
        print("\nImage passed quality checks.")


if __name__ == "__main__":
    main()