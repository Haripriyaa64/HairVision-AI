from pathlib import Path

from PIL import Image

from backend.try_on.hair_transfer_provider import HairFastGANProvider


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

USER_IMAGE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "face"
    / "image.png"
)

REFERENCE_IMAGE = (
    PROJECT_ROOT
    / "backend"
    / "try_on"
    / "curly_reference.png"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "backend"
    / "try_on"
    / "outputs"
)

OUTPUT_IMAGE = (
    OUTPUT_DIR
    / "hairfastgan_curly_test.png"
)


# ============================================================
# VALIDATION
# ============================================================

print("=" * 70)
print("HAIRVISION — REAL HAIRSTYLE TRANSFER TEST")
print("=" * 70)

print("\nProject:")
print(PROJECT_ROOT)

print("\nUser image:")
print(USER_IMAGE)

print("\nReference hairstyle:")
print(REFERENCE_IMAGE)


if not USER_IMAGE.exists():
    raise FileNotFoundError(
        f"User image not found:\n{USER_IMAGE}"
    )

if not REFERENCE_IMAGE.exists():
    raise FileNotFoundError(
        f"Reference image not found:\n{REFERENCE_IMAGE}"
    )


# ============================================================
# LOAD IMAGES
# ============================================================

print("\nLoading images...")

user_image = Image.open(USER_IMAGE).convert("RGB")
reference_image = Image.open(
    REFERENCE_IMAGE
).convert("RGB")

print(
    f"User image size      : {user_image.size}"
)

print(
    f"Reference image size : {reference_image.size}"
)


# ============================================================
# PROVIDER
# ============================================================

print("\nConnecting to hairstyle transfer engine...")

provider = HairFastGANProvider()

health = provider.health()

print("\nProvider status:")
print(health)

if not health.get("available"):
    raise RuntimeError(
        "Hair transfer provider is not available.\n"
        f"{health.get('message', '')}"
    )


# ============================================================
# TRANSFER
# ============================================================

print("\nStarting REAL hairstyle transfer...")
print("This may take some time.")
print()

result = provider.transfer(
    user_image=user_image,
    hairstyle_image=reference_image,
)


# ============================================================
# SAVE RESULT
# ============================================================

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

result.save(
    OUTPUT_IMAGE,
    format="PNG",
)

print("\n" + "=" * 70)
print("SUCCESS")
print("=" * 70)

print("\nResult:")
print(OUTPUT_IMAGE)

print(
    f"\nResult size: {result.size}"
)

print("\nOpen the output image and check:")
print("1. Is the SAME face preserved?")
print("2. Is the OLD hairstyle replaced?")
print("3. Is the curly hairstyle actually adapted to the head?")
print("4. Is there any rectangular/collage area?")
print("5. Does it look like the person actually has the hairstyle?")
print()