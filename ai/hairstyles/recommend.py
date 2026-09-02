from pathlib import Path
import json


# ---------------------------------------------------------
# PROJECT PATH
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

CATALOG_PATH = (
    PROJECT_ROOT
    / "data"
    / "hairstyles"
    / "hairstyles.json"
)


# ---------------------------------------------------------
# LOAD CATALOG
# ---------------------------------------------------------

def load_catalog():
    if not CATALOG_PATH.exists():
        raise FileNotFoundError(
            f"Hairstyle catalog not found:\n{CATALOG_PATH}"
        )

    with open(CATALOG_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


# ---------------------------------------------------------
# RECOMMEND HAIRSTYLES
# ---------------------------------------------------------

def recommend_hairstyles(
    face_shape: str,
    gender: str,
    limit: int = 6,
):
    face_shape = face_shape.lower().strip()
    gender = gender.lower().strip()

    valid_face_shapes = {
        "heart",
        "oblong",
        "oval",
        "round",
        "square",
    }

    valid_genders = {
        "men",
        "women",
    }

    if face_shape not in valid_face_shapes:
        raise ValueError(
            f"Invalid face shape: {face_shape}"
        )

    if gender not in valid_genders:
        raise ValueError(
            f"Invalid gender: {gender}"
        )

    catalog = load_catalog()

    hairstyles = catalog.get("hairstyles", [])

    # -----------------------------------------------------
    # FILTER BY GENDER
    # -----------------------------------------------------

    matching_styles = [
        style
        for style in hairstyles
        if style.get("gender") == gender
    ]

    # -----------------------------------------------------
    # CALCULATE MATCH SCORE
    # -----------------------------------------------------

    recommendations = []

    for style in matching_styles:

        scores = style.get(
            "face_shape_scores",
            {}
        )

        raw_score = float(
            scores.get(face_shape, 0)
        )

        recommendations.append(
            {
                "id": style.get("id"),
                "name": style.get("name"),
                "gender": style.get("gender"),
                "length": style.get("length"),
                "textures": style.get("textures", []),
                "match_score": round(
                    raw_score * 100,
                    1,
                ),
                "maintenance": style.get(
                    "maintenance",
                    "medium",
                ),
                "tags": style.get(
                    "tags",
                    [],
                ),
                "try_on_ready": style.get(
                    "try_on_ready",
                    False,
                ),
            }
        )

    # -----------------------------------------------------
    # SORT BEST → WORST
    # -----------------------------------------------------

    recommendations.sort(
        key=lambda item: item["match_score"],
        reverse=True,
    )

    # -----------------------------------------------------
    # LIMIT RESULTS
    # -----------------------------------------------------

    return recommendations[:limit]