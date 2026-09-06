from pathlib import Path

from PIL import Image

from backend.try_on.perfectcorp_provider import (
    PerfectCorpHairProvider,
)


USER_IMAGE = Path(
    "data/raw/face/image.png"
)

REFERENCE_IMAGE = Path(
    "backend/try_on/curly_reference.png"
)

OUTPUT = Path(
    "backend/try_on/outputs/"
    "perfectcorp_provider_test.jpg"
)


def main():

    print("=" * 70)
    print("HAIRVISION-AI")
    print("PERFECT CORP PROVIDER TEST")
    print("=" * 70)

    user_image = Image.open(
        USER_IMAGE
    )

    hairstyle_image = Image.open(
        REFERENCE_IMAGE
    )

    provider = PerfectCorpHairProvider()

    print()
    print(
        "Provider:",
        provider.health()
    )

    result = provider.transfer(
        user_image=user_image,
        hairstyle_image=hairstyle_image,
    )

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    result.save(
        OUTPUT,
        "JPEG",
        quality=95,
    )

    print()
    print("=" * 70)
    print("SUCCESS")
    print("=" * 70)

    print(
        "Output:",
        OUTPUT.resolve()
    )


if __name__ == "__main__":
    main()