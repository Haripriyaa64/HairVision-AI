import cv2
import numpy as np
import mediapipe as mp
from pathlib import Path

# --------------------------------------------------
# PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = PROJECT_ROOT / "backend" / "try_on" / "models" / "hair_segmenter.tflite"

IMAGE_PATH = PROJECT_ROOT / "data" / "raw" / "face" / "image.png"

OUTPUT_PATH = PROJECT_ROOT / "backend" / "try_on" / "hair_mask.png"


# --------------------------------------------------
# LOAD IMAGE
# --------------------------------------------------

image = cv2.imread(str(IMAGE_PATH))

if image is None:
    raise FileNotFoundError(f"Image not found: {IMAGE_PATH}")

rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

mp_image = mp.Image(
    image_format=mp.ImageFormat.SRGB,
    data=rgb_image
)


# --------------------------------------------------
# CREATE HAIR SEGMENTER
# --------------------------------------------------

BaseOptions = mp.tasks.BaseOptions
ImageSegmenter = mp.tasks.vision.ImageSegmenter
ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
VisionRunningMode = mp.tasks.vision.RunningMode


options = ImageSegmenterOptions(
    base_options=BaseOptions(
        model_asset_path=str(MODEL_PATH)
    ),
    running_mode=VisionRunningMode.IMAGE,
    output_category_mask=True,
)


# --------------------------------------------------
# RUN SEGMENTATION
# --------------------------------------------------

with ImageSegmenter.create_from_options(options) as segmenter:

    result = segmenter.segment(mp_image)

    category_mask = result.category_mask


# --------------------------------------------------
# CREATE BINARY HAIR MASK
# --------------------------------------------------

mask = category_mask.numpy_view()

# Hair class = 1
hair_mask = np.where(mask == 1, 255, 0).astype(np.uint8)


# --------------------------------------------------
# CLEAN MASK
# --------------------------------------------------

kernel = np.ones((3, 3), np.uint8)

hair_mask = cv2.morphologyEx(
    hair_mask,
    cv2.MORPH_OPEN,
    kernel
)

hair_mask = cv2.morphologyEx(
    hair_mask,
    cv2.MORPH_CLOSE,
    kernel
)


# --------------------------------------------------
# SAVE MASK
# --------------------------------------------------

cv2.imwrite(str(OUTPUT_PATH), hair_mask)

print("Hair segmentation successful!")
print("Input :", IMAGE_PATH)
print("Output:", OUTPUT_PATH)
print("Mask size:", hair_mask.shape)
print("Hair pixels:", int(np.sum(hair_mask > 0)))