from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Optional

from PIL import Image


class HairTransferError(Exception):
    """Raised when the hairstyle transfer provider fails."""
    pass


class HairTransferProvider:
    """
    Base interface for hairstyle transfer providers.
    """

    name = "base"

    def health(self) -> dict:
        raise NotImplementedError

    def transfer(
        self,
        user_image: Image.Image,
        hairstyle_image: Image.Image,
    ) -> Image.Image:
        raise NotImplementedError


class HairFastGANProvider(HairTransferProvider):
    """
    Hosted HairFastGAN provider.

    The AI model runs remotely.
    Nothing large is downloaded to the laptop.
    """

    name = "hairfastgan"

    def __init__(self, space_id: Optional[str] = None):

        self.space_id = (
            space_id
            or os.getenv(
                "HAIR_TRANSFER_SPACE",
                "AIRI-Institute/HairFastGAN",
            )
        )

        self._client = None

    # ========================================================
    # CONNECT TO HOSTED MODEL
    # ========================================================

    def _get_client(self):

        if self._client is None:

            try:
                from gradio_client import Client

                print(
                    f"Connecting to Space: {self.space_id}"
                )

                self._client = Client(
                    self.space_id
                )

            except Exception as exc:

                raise HairTransferError(
                    "Could not connect to "
                    f"HairFastGAN Space: {exc}"
                ) from exc

        return self._client

    # ========================================================
    # HEALTH CHECK
    # ========================================================

    def health(self) -> dict:

        try:

            self._get_client()

            return {
                "available": True,
                "provider": self.name,
                "space": self.space_id,
                "message": (
                    "HairFastGAN provider connected."
                ),
            }

        except Exception as exc:

            return {
                "available": False,
                "provider": self.name,
                "space": self.space_id,
                "message": str(exc),
            }

    # ========================================================
    # HAIRSTYLE TRANSFER
    # ========================================================

    def transfer(
        self,
        user_image: Image.Image,
        hairstyle_image: Image.Image,
    ) -> Image.Image:

        if user_image is None:
            raise HairTransferError(
                "User image is required."
            )

        if hairstyle_image is None:
            raise HairTransferError(
                "Hairstyle reference image is required."
            )

        # Make sure both are standard RGB images.
        user_image = user_image.convert("RGB")
        hairstyle_image = hairstyle_image.convert("RGB")

        client = self._get_client()

        # ----------------------------------------------------
        # Temporary files
        # ----------------------------------------------------

        with tempfile.TemporaryDirectory() as tmp:

            tmp = Path(tmp)

            user_path = tmp / "user.png"
            hairstyle_path = tmp / "hairstyle.png"

            user_image.save(
                user_path,
                format="PNG",
            )

            hairstyle_image.save(
                hairstyle_path,
                format="PNG",
            )

            print(
                "\nSending images to HairFastGAN..."
            )

            try:

                from gradio_client import handle_file

                result = client.predict(

                    face=handle_file(
                        str(user_path)
                    ),

                    shape=handle_file(
                        str(hairstyle_path)
                    ),

                    color=None,

                    blending="Article",

                    poisson_iters=0,

                    poisson_erosion=15,

                    api_name="/swap_hair",
                )

            except Exception as exc:

                raise HairTransferError(
                    "HairFastGAN hairstyle transfer "
                    f"failed: {exc}"
                ) from exc

            # ------------------------------------------------
            # Convert provider response into PIL image
            # ------------------------------------------------

            return self._extract_image(result)

    # ========================================================
    # RESPONSE PARSER
    # ========================================================

    @staticmethod
    def _extract_image(result) -> Image.Image:

        print(
            f"HairFastGAN response type: "
            f"{type(result)}"
        )

        # ----------------------------------------------------
        # Tuple response
        # ----------------------------------------------------

        if isinstance(result, tuple):

            if len(result) == 0:
                raise HairTransferError(
                    "HairFastGAN returned an empty tuple."
                )

            result = result[0]

        # ----------------------------------------------------
        # PIL Image
        # ----------------------------------------------------

        if isinstance(
            result,
            Image.Image,
        ):

            return result.convert("RGB")

        # ----------------------------------------------------
        # Dictionary response
        # ----------------------------------------------------

        if isinstance(result, dict):

            path = (
                result.get("path")
                or result.get("value")
            )

            url = result.get("url")

            if path:

                path = Path(path)

                if path.exists():

                    return Image.open(
                        path
                    ).convert("RGB")

            if url:

                try:

                    import requests

                    response = requests.get(
                        url,
                        timeout=120,
                    )

                    response.raise_for_status()

                    from io import BytesIO

                    return Image.open(
                        BytesIO(
                            response.content
                        )
                    ).convert("RGB")

                except Exception as exc:

                    raise HairTransferError(
                        "Could not download "
                        f"result image: {exc}"
                    ) from exc

        # ----------------------------------------------------
        # String path
        # ----------------------------------------------------

        if isinstance(result, str):

            path = Path(result)

            if path.exists():

                return Image.open(
                    path
                ).convert("RGB")

        # ----------------------------------------------------
        # Unsupported response
        # ----------------------------------------------------

        raise HairTransferError(
            "Unexpected HairFastGAN response: "
            f"{result!r}"
        )