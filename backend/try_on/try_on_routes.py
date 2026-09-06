from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image

from backend.try_on.perfectcorp_provider import (
    PerfectCorpHairProvider,
    PerfectCorpError,
)


router = APIRouter(
    prefix="/try-on",
    tags=["Try-On"],
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]

HAIRSTYLES_FILE = (
    PROJECT_ROOT
    / "data"
    / "hairstyles"
    / "hairstyles.json"
)

HAIRSTYLE_IMAGES = (
    PROJECT_ROOT
    / "frontend"
    / "public"
    / "hairstyles"
)


# ============================================================
# REFERENCE IMAGE MAPPING
# ============================================================

REFERENCE_OVERRIDES = {
    "men-curly-top":
        "men-curly-textured-top.png",

    "men-side-part":
        "men-classic-side-part.png",

    "men-curly-textured-top":
        "men-curly-textured-top.png",
}


# ============================================================
# LOAD STYLE CATALOG
# ============================================================

def load_styles() -> list[dict]:

    if not HAIRSTYLES_FILE.exists():
        raise RuntimeError(
            f"Hairstyle catalog not found: "
            f"{HAIRSTYLES_FILE}"
        )

    with open(
        HAIRSTYLES_FILE,
        "r",
        encoding="utf-8",
    ) as f:
        return json.load(f)


# ============================================================
# FIND SELECTED STYLE
# ============================================================

def find_style(
    style_id: str,
) -> dict | None:

    styles = load_styles()

    # Your hairstyles.json can be either:
    # 1. A list of hairstyle objects
    # 2. A dictionary containing hairstyle objects/lists

    def search(value):

        if isinstance(value, dict):

            # Direct hairstyle object
            if value.get("id") == style_id:
                return value

            # Search nested values
            for nested_value in value.values():

                result = search(nested_value)

                if result is not None:
                    return result

        elif isinstance(value, list):

            for item in value:

                result = search(item)

                if result is not None:
                    return result

        return None

    return search(styles)


# ============================================================
# FIND REFERENCE IMAGE
# ============================================================

def find_reference_image(
    style: dict,
) -> Path:

    style_id = style.get("id")

    if not style_id:
        raise HTTPException(
            status_code=400,
            detail="Hairstyle has no ID.",
        )

    # --------------------------------------------
    # Explicit mapping first
    # --------------------------------------------

    if style_id in REFERENCE_OVERRIDES:

        filename = REFERENCE_OVERRIDES[
            style_id
        ]

        path = (
            HAIRSTYLE_IMAGES
            / filename
        )

        if path.exists():
            return path

    # --------------------------------------------
    # Style catalog reference
    # --------------------------------------------

    possible_names = []

    for key in (
        "reference_image",
        "image",
        "image_path",
        "filename",
    ):

        value = style.get(key)

        if value:
            possible_names.append(
                Path(str(value)).name
            )

    # --------------------------------------------
    # ID-based lookup
    # --------------------------------------------

    possible_names.extend(
        [
            f"{style_id}.png",
            f"{style_id}.jpg",
            f"{style_id}.jpeg",
        ]
    )

    for filename in possible_names:

        path = (
            HAIRSTYLE_IMAGES
            / filename
        )

        if path.exists():
            return path

    # --------------------------------------------
    # Try matching normalized ID
    # --------------------------------------------

    normalized_id = (
        style_id
        .lower()
        .replace("_", "-")
        .replace(" ", "-")
    )

    if HAIRSTYLE_IMAGES.exists():

        for path in HAIRSTYLE_IMAGES.iterdir():

            if not path.is_file():
                continue

            stem = (
                path.stem
                .lower()
                .replace("_", "-")
                .replace(" ", "-")
            )

            if stem == normalized_id:
                return path

    raise HTTPException(
        status_code=404,
        detail=(
            "Reference image not found for "
            f"hairstyle '{style_id}'."
        ),
    )


# ============================================================
# GENDER COMPATIBILITY
# ============================================================

def validate_gender(
    selected_gender: str,
    style: dict,
) -> None:

    selected_gender = (
        selected_gender
        .strip()
        .lower()
    )

    style_gender = str(
        style.get("gender", "")
    ).strip().lower()

    if selected_gender not in {
        "men",
        "women",
        "male",
        "female",
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid gender. "
                "Use men or women."
            ),
        )

    # Normalize
    if selected_gender == "male":
        selected_gender = "men"

    if selected_gender == "female":
        selected_gender = "women"

    if style_gender == "male":
        style_gender = "men"

    if style_gender == "female":
        style_gender = "women"

    if (
        style_gender
        and selected_gender != style_gender
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "This hairstyle is not compatible "
                "with the selected gender."
            ),
        )


# ============================================================
# TRY-ON ENDPOINT
# ============================================================

@router.post("")
async def try_on(
    image: UploadFile = File(...),
    hairstyle_id: str = Form(...),
    gender: str = Form(...),
):

    # --------------------------------------------
    # Validate uploaded file
    # --------------------------------------------

    if not image.content_type:

        raise HTTPException(
            status_code=400,
            detail="Image type is missing.",
        )

    if not image.content_type.startswith(
        "image/"
    ):

        raise HTTPException(
            status_code=400,
            detail="Please upload an image.",
        )

    # --------------------------------------------
    # Find hairstyle
    # --------------------------------------------

    style = find_style(
        hairstyle_id
    )

    if style is None:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Hairstyle '{hairstyle_id}' "
                "was not found."
            ),
        )

    # --------------------------------------------
    # Gender validation
    # --------------------------------------------

    validate_gender(
        gender,
        style,
    )

    # --------------------------------------------
    # Find reference
    # --------------------------------------------

    reference_path = (
        find_reference_image(
            style
        )
    )

    # --------------------------------------------
    # Read uploaded image
    # --------------------------------------------

    try:

        image_bytes = await image.read()

        if not image_bytes:
            raise ValueError(
                "Empty image."
            )

        user_image = Image.open(
            __import__("io").BytesIO(
                image_bytes
            )
        )

        user_image.load()

        user_image = user_image.convert(
            "RGB"
        )

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=(
                "Could not read the uploaded "
                f"image: {exc}"
            ),
        )

    # --------------------------------------------
    # Read hairstyle reference
    # --------------------------------------------

    try:

        hairstyle_image = Image.open(
            reference_path
        )

        hairstyle_image.load()

        hairstyle_image = (
            hairstyle_image.convert("RGB")
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not read hairstyle "
                f"reference: {exc}"
            ),
        )

    # --------------------------------------------
    # Run Perfect Corp
    # --------------------------------------------

    try:

        provider = (
            PerfectCorpHairProvider()
        )

        result = provider.transfer(
            user_image=user_image,
            hairstyle_image=hairstyle_image,
        )

    except PerfectCorpError as exc:

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Unexpected hairstyle "
                f"transfer error: {exc}"
            ),
        )

    # --------------------------------------------
    # Convert result to base64
    # --------------------------------------------

    import base64
    import io

    output_buffer = io.BytesIO()

    result.save(
        output_buffer,
        format="JPEG",
        quality=95,
    )

    encoded = base64.b64encode(
        output_buffer.getvalue()
    ).decode("utf-8")

    # --------------------------------------------
    # Response
    # --------------------------------------------

    return {
        "success": True,
        "hairstyle_id": hairstyle_id,
        "hairstyle_name": style.get(
            "name",
            hairstyle_id,
        ),
        "gender": gender,
        "image": (
            f"data:image/jpeg;base64,"
            f"{encoded}"
        ),
    }