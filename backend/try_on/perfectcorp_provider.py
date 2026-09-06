from __future__ import annotations

import io
import os
import time
from pathlib import Path
from typing import Optional

import requests
from PIL import Image


class PerfectCorpError(Exception):
    """Raised when Perfect Corp hairstyle transfer fails."""
    pass


class PerfectCorpHairProvider:
    """
    Perfect Corp AI Hairstyle Transfer provider.

    The AI model runs remotely.
    No large AI model is stored locally.
    """

    name = "perfectcorp"

    BASE_URL = "https://yce-api-01.makeupar.com"

    def __init__(
        self,
        api_key: Optional[str] = None,
    ):
        self.api_key = (
            api_key
            or os.getenv("PERFECT_CORP_API_KEY")
        )

        if not self.api_key:
            raise PerfectCorpError(
                "PERFECT_CORP_API_KEY is not set."
            )

        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
        }

    # ========================================================
    # HEALTH
    # ========================================================

    def health(self) -> dict:

        if not self.api_key:
            return {
                "available": False,
                "provider": self.name,
                "message": "API key not configured.",
            }

        return {
            "available": True,
            "provider": self.name,
            "message": "Perfect Corp API configured.",
        }

    # ========================================================
    # IMAGE PREPARATION
    # ========================================================

    @staticmethod
    def prepare_image(
        image: Image.Image,
    ) -> bytes:

        if image is None:
            raise PerfectCorpError(
                "Image is required."
            )

        image = image.convert("RGB")

        max_side = 1024

        width, height = image.size

        longest_side = max(
            width,
            height,
        )

        if longest_side > max_side:

            scale = (
                max_side /
                float(longest_side)
            )

            new_width = max(
                1,
                int(width * scale)
            )

            new_height = max(
                1,
                int(height * scale)
            )

            image = image.resize(
                (
                    new_width,
                    new_height,
                ),
                Image.Resampling.LANCZOS,
            )

        buffer = io.BytesIO()

        image.save(
            buffer,
            format="JPEG",
            quality=95,
            optimize=True,
        )

        data = buffer.getvalue()

        if len(data) >= 10 * 1024 * 1024:
            raise PerfectCorpError(
                "Prepared image is larger than 10 MB."
            )

        return data

    # ========================================================
    # UPLOAD FILE
    # ========================================================

    def upload_image(
        self,
        image: Image.Image,
        filename: str,
    ) -> str:

        image_bytes = self.prepare_image(
            image
        )

        print(
            f"Uploading {filename} "
            f"({len(image_bytes) / 1024:.1f} KB)..."
        )

        # --------------------------------------------
        # Request upload information
        # --------------------------------------------

        response = requests.post(
            f"{self.BASE_URL}/s2s/v2.0/file",
            headers={
                **self.headers,
                "Content-Type": "application/json",
            },
            json={
                "files": [
                    {
                        "content_type": "image/jpeg",
                        "file_name": filename,
                        "file_size": len(image_bytes),
                    }
                ]
            },
            timeout=60,
        )

        if not response.ok:
            raise PerfectCorpError(
                "Perfect Corp file initialization failed: "
                f"{response.status_code} "
                f"{response.text}"
            )

        data = response.json()

        try:

            file_info = (
                data["data"]["files"][0]
            )

            file_id = file_info["file_id"]

            upload_request = (
                file_info["requests"][0]
            )

            upload_url = (
                upload_request["url"]
            )

            upload_headers = (
                upload_request.get(
                    "headers",
                    {},
                )
            )

        except (
            KeyError,
            IndexError,
            TypeError,
        ) as exc:

            raise PerfectCorpError(
                "Unexpected Perfect Corp "
                f"upload response: {data}"
            ) from exc

        # --------------------------------------------
        # Upload actual image
        # --------------------------------------------

        upload_response = requests.put(
            upload_url,
            headers=upload_headers,
            data=image_bytes,
            timeout=120,
        )

        if not upload_response.ok:

            raise PerfectCorpError(
                "Image upload failed: "
                f"{upload_response.status_code} "
                f"{upload_response.text}"
            )

        print(
            f"Upload successful: {file_id}"
        )

        return file_id

    # ========================================================
    # CREATE HAIR TRANSFER TASK
    # ========================================================

    def create_task(
        self,
        source_file_id: str,
        reference_file_id: str,
    ) -> str:

        print(
            "Creating Perfect Corp "
            "hairstyle transfer task..."
        )

        response = requests.post(
            (
                f"{self.BASE_URL}"
                "/s2s/v2.1/task/hair-transfer"
            ),
            headers={
                **self.headers,
                "Content-Type": "application/json",
            },
            json={
                "src_file_id": source_file_id,
                "ref_file_id": reference_file_id,
            },
            timeout=60,
        )

        if not response.ok:

            raise PerfectCorpError(
                "Hair transfer task creation failed: "
                f"{response.status_code} "
                f"{response.text}"
            )

        data = response.json()

        try:

            task_id = (
                data["data"]["task_id"]
            )

        except (
            KeyError,
            TypeError,
        ) as exc:

            raise PerfectCorpError(
                "No task_id returned by "
                f"Perfect Corp: {data}"
            ) from exc

        print(
            f"Task created: {task_id}"
        )

        return task_id

    # ========================================================
    # POLL TASK
    # ========================================================

    def wait_for_result(
        self,
        task_id: str,
        timeout_seconds: int = 180,
        poll_seconds: int = 4,
    ) -> str:

        url = (
            f"{self.BASE_URL}"
            "/s2s/v2.1/task/hair-transfer/"
            f"{task_id}"
        )

        start_time = time.time()

        while (
            time.time() - start_time
            < timeout_seconds
        ):

            response = requests.get(
                url,
                headers=self.headers,
                timeout=60,
            )

            if not response.ok:

                raise PerfectCorpError(
                    "Task status request failed: "
                    f"{response.status_code} "
                    f"{response.text}"
                )

            data = response.json()

            task_data = data.get(
                "data",
                {},
            )

            status = task_data.get(
                "task_status"
            )

            print(
                f"Perfect Corp task status: "
                f"{status}"
            )

            # ----------------------------------------
            # SUCCESS
            # ----------------------------------------

            if status == "success":

                results = task_data.get(
                    "results",
                    {},
                )

                result_url = results.get(
                    "url"
                )

                if not result_url:

                    raise PerfectCorpError(
                        "Perfect Corp returned success "
                        "but no result URL."
                    )

                return result_url

            # ----------------------------------------
            # ERROR
            # ----------------------------------------

            if status == "error":

                error = task_data.get(
                    "error"
                )

                raise PerfectCorpError(
                    "Perfect Corp hairstyle "
                    f"transfer failed: {error}"
                )

            time.sleep(
                poll_seconds
            )

        raise PerfectCorpError(
            "Perfect Corp hairstyle transfer "
            "timed out."
        )

    # ========================================================
    # DOWNLOAD RESULT
    # ========================================================

    @staticmethod
    def download_result(
        result_url: str,
    ) -> Image.Image:

        response = requests.get(
            result_url,
            timeout=120,
        )

        if not response.ok:

            raise PerfectCorpError(
                "Could not download generated "
                f"image: {response.status_code}"
            )

        try:

            image = Image.open(
                io.BytesIO(
                    response.content
                )
            )

            return image.convert("RGB")

        except Exception as exc:

            raise PerfectCorpError(
                "Perfect Corp returned an "
                "invalid image."
            ) from exc

    # ========================================================
    # MAIN TRANSFER FUNCTION
    # ========================================================

    def transfer(
        self,
        user_image: Image.Image,
        hairstyle_image: Image.Image,
    ) -> Image.Image:

        if user_image is None:
            raise PerfectCorpError(
                "User image is required."
            )

        if hairstyle_image is None:
            raise PerfectCorpError(
                "Hairstyle reference image "
                "is required."
            )

        print()
        print("=" * 70)
        print("PERFECT CORP AI HAIRSTYLE TRANSFER")
        print("=" * 70)

        # --------------------------------------------
        # Upload user
        # --------------------------------------------

        source_file_id = self.upload_image(
            user_image,
            "user_photo.jpg",
        )

        # --------------------------------------------
        # Upload hairstyle reference
        # --------------------------------------------

        reference_file_id = self.upload_image(
            hairstyle_image,
            "hairstyle_reference.jpg",
        )

        # --------------------------------------------
        # Create task
        # --------------------------------------------

        task_id = self.create_task(
            source_file_id,
            reference_file_id,
        )

        # --------------------------------------------
        # Wait for AI
        # --------------------------------------------

        result_url = self.wait_for_result(
            task_id
        )

        # --------------------------------------------
        # Download result
        # --------------------------------------------

        result_image = (
            self.download_result(
                result_url
            )
        )

        print()
        print(
            "Hairstyle transfer completed."
        )

        return result_image