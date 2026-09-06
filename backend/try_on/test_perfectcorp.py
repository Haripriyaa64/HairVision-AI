import os
import time
from pathlib import Path

import requests


# ============================================================
# CONFIG
# ============================================================

API_KEY = os.getenv("PERFECT_CORP_API_KEY")

BASE_URL = "https://yce-api-01.makeupar.com"

USER_IMAGE = Path(
    "data/raw/face/image.png"
)

REFERENCE_IMAGE = Path(
    "backend/try_on/curly_reference.png"
)

OUTPUT_DIR = Path(
    "backend/try_on/outputs"
)

OUTPUT_FILE = OUTPUT_DIR / "perfectcorp_curly_test.jpg"


# ============================================================
# VALIDATION
# ============================================================

if not API_KEY:
    raise RuntimeError(
        "PERFECT_CORP_API_KEY environment variable is not set."
    )

if not USER_IMAGE.exists():
    raise FileNotFoundError(
        f"User image not found: {USER_IMAGE}"
    )

if not REFERENCE_IMAGE.exists():
    raise FileNotFoundError(
        f"Reference image not found: {REFERENCE_IMAGE}"
    )

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
}


# ============================================================
# UPLOAD IMAGE
# ============================================================

def upload_image(image_path: Path) -> str:

    print()
    print("=" * 70)
    print(f"Uploading: {image_path}")
    print("=" * 70)

    file_size = image_path.stat().st_size

    # Step 1: request upload information
    response = requests.post(
        f"{BASE_URL}/s2s/v2.0/file",
        headers={
            **HEADERS,
            "Content-Type": "application/json",
        },
        json={
            "files": [
                {
                    "content_type": "image/jpeg",
                    "file_name": image_path.name,
                    "file_size": file_size,
                }
            ]
        },
        timeout=60,
    )

    print("File API status:", response.status_code)

    if not response.ok:
        print(response.text)
        response.raise_for_status()

    data = response.json()

    try:
        file_info = data["data"]["files"][0]
        file_id = file_info["file_id"]
        upload_request = file_info["requests"][0]

        upload_url = upload_request["url"]
        upload_headers = upload_request.get(
            "headers",
            {}
        )

    except (KeyError, IndexError) as exc:
        print("Unexpected response:")
        print(data)
        raise RuntimeError(
            "Could not extract upload information."
        ) from exc

    # Step 2: upload actual image
    print("Uploading image bytes...")

    with open(image_path, "rb") as f:

        upload_response = requests.put(
            upload_url,
            headers=upload_headers,
            data=f,
            timeout=120,
        )

    print(
        "Storage upload status:",
        upload_response.status_code
    )

    if not upload_response.ok:
        print(upload_response.text)
        upload_response.raise_for_status()

    print("Upload successful.")
    print("File ID:", file_id)

    return file_id


# ============================================================
# CREATE HAIR TRANSFER TASK
# ============================================================

def create_hair_transfer(
    user_file_id: str,
    reference_file_id: str,
) -> str:

    print()
    print("=" * 70)
    print("Creating AI hairstyle transfer task...")
    print("=" * 70)

    response = requests.post(
        f"{BASE_URL}/s2s/v2.1/task/hair-transfer",
        headers={
            **HEADERS,
            "Content-Type": "application/json",
        },
        json={
            "src_file_id": user_file_id,
            "ref_file_id": reference_file_id,
        },
        timeout=60,
    )

    print(
        "Hair transfer status:",
        response.status_code
    )

    if not response.ok:
        print(response.text)
        response.raise_for_status()

    data = response.json()

    try:
        task_id = data["data"]["task_id"]
    except KeyError as exc:
        print("Unexpected response:")
        print(data)
        raise RuntimeError(
            "Could not obtain task ID."
        ) from exc

    print("Task created successfully.")
    print("Task ID:", task_id)

    return task_id


# ============================================================
# POLL TASK
# ============================================================

def wait_for_result(task_id: str):

    print()
    print("=" * 70)
    print("Waiting for AI hairstyle transformation...")
    print("=" * 70)

    url = (
        f"{BASE_URL}/s2s/v2.1/task/"
        f"hair-transfer/{task_id}"
    )

    for attempt in range(60):

        response = requests.get(
            url,
            headers=HEADERS,
            timeout=60,
        )

        print(
            f"Check {attempt + 1}/60 "
            f"HTTP {response.status_code}"
        )

        if not response.ok:
            print(response.text)
            response.raise_for_status()

        data = response.json()

        task_data = data.get(
            "data",
            {}
        )

        status = task_data.get(
            "task_status"
        )

        print(
            "Task status:",
            status
        )

        if status == "success":

            result = task_data.get(
                "results",
                {}
            )

            result_url = result.get(
                "url"
            )

            if not result_url:
                raise RuntimeError(
                    "Task succeeded but no result URL was returned."
                )

            return result_url

        if status == "error":

            error = task_data.get(
                "error"
            )

            raise RuntimeError(
                f"Perfect Corp task failed: {error}"
            )

        time.sleep(5)

    raise TimeoutError(
        "Perfect Corp task did not finish within the timeout."
    )


# ============================================================
# DOWNLOAD RESULT
# ============================================================

def download_result(result_url: str):

    print()
    print("=" * 70)
    print("Downloading generated hairstyle...")
    print("=" * 70)

    response = requests.get(
        result_url,
        timeout=120,
    )

    response.raise_for_status()

    with open(
        OUTPUT_FILE,
        "wb"
    ) as f:

        f.write(
            response.content
        )

    print()
    print("SUCCESS!")
    print()
    print("Generated image:")
    print(OUTPUT_FILE.resolve())
    print()


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 70)
    print("HAIRVISION-AI")
    print("PERFECT CORP HAIRSTYLE TRANSFER TEST")
    print("=" * 70)

    print()
    print("User image:")
    print(USER_IMAGE.resolve())

    print()
    print("Reference hairstyle:")
    print(REFERENCE_IMAGE.resolve())

    # Upload user's face
    user_file_id = upload_image(
        USER_IMAGE
    )

    # Upload hairstyle reference
    reference_file_id = upload_image(
        REFERENCE_IMAGE
    )

    # Create transfer task
    task_id = create_hair_transfer(
        user_file_id,
        reference_file_id,
    )

    # Wait for AI
    result_url = wait_for_result(
        task_id
    )

    # Save result
    download_result(
        result_url
    )


if __name__ == "__main__":
    main()