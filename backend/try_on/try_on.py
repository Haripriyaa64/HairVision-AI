import cv2
import numpy as np
import mediapipe as mp
from pathlib import Path


class HairstyleTryOn:

    # --------------------------------------------------
    # CONFIGURATION
    # --------------------------------------------------

    MODEL_PATH = (
        Path(__file__).resolve().parent
        / "models"
        / "hair_segmenter.tflite"
    )

    OUTPUT_DIR = (
        Path(__file__).resolve().parent
        / "outputs"
    )

    # Hair size relative to detected target hair
    WIDTH_SCALE = 1.15
    HEIGHT_SCALE = 1.20

    # Edge softness
    BLUR_SIZE = 11

    # OpenCV inpainting strength
    INPAINT_RADIUS = 7


    # --------------------------------------------------
    # INITIALIZATION
    # --------------------------------------------------

    def __init__(self):

        self.OUTPUT_DIR.mkdir(
            parents=True,
            exist_ok=True
        )

        if not self.MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Hair Segmenter model not found:\n"
                f"{self.MODEL_PATH}"
            )

        self.BaseOptions = mp.tasks.BaseOptions

        self.ImageSegmenter = (
            mp.tasks.vision.ImageSegmenter
        )

        self.ImageSegmenterOptions = (
            mp.tasks.vision.ImageSegmenterOptions
        )

        self.RunningMode = (
            mp.tasks.vision.RunningMode
        )

        self.options = (
            self.ImageSegmenterOptions(
                base_options=self.BaseOptions(
                    model_asset_path=str(
                        self.MODEL_PATH
                    )
                ),
                running_mode=self.RunningMode.IMAGE,
                output_category_mask=True,
            )
        )

        print("Hairstyle Try-On initialized")
        print(
            "Model:",
            self.MODEL_PATH
        )
        print("Model size: 0.75 MB")
        print("Device: CPU")


    # --------------------------------------------------
    # LOAD IMAGE
    # --------------------------------------------------

    def load_image(self, path):

        image = cv2.imread(
            str(path),
            cv2.IMREAD_COLOR
        )

        if image is None:
            raise FileNotFoundError(
                f"Could not load image:\n{path}"
            )

        return image


    # --------------------------------------------------
    # HAIR SEGMENTATION
    # --------------------------------------------------

    def get_hair_mask(self, image):

        rgb = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2RGB
        )

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb
        )

        with self.ImageSegmenter.create_from_options(
            self.options
        ) as segmenter:

            result = segmenter.segment(
                mp_image
            )

        mask = (
            result.category_mask.numpy_view()
        )

        # MediaPipe Hair Segmenter:
        # 1 = hair
        hair_mask = np.where(
            mask == 1,
            255,
            0
        ).astype(np.uint8)

        # Remove tiny noise
        kernel = np.ones(
            (5, 5),
            np.uint8
        )

        hair_mask = cv2.morphologyEx(
            hair_mask,
            cv2.MORPH_OPEN,
            kernel
        )

        # Close small holes
        hair_mask = cv2.morphologyEx(
            hair_mask,
            cv2.MORPH_CLOSE,
            kernel
        )

        return hair_mask


    # --------------------------------------------------
    # LARGEST CONNECTED HAIR REGION
    # --------------------------------------------------

    def largest_component(self, mask):

        count, labels, stats, _ = (
            cv2.connectedComponentsWithStats(
                mask,
                connectivity=8
            )
        )

        if count <= 1:
            return mask

        areas = stats[
            1:,
            cv2.CC_STAT_AREA
        ]

        largest = (
            np.argmax(areas) + 1
        )

        result = np.zeros_like(mask)

        result[
            labels == largest
        ] = 255

        return result


    # --------------------------------------------------
    # HAIR BOUNDING BOX
    # --------------------------------------------------

    def get_bbox(self, mask):

        ys, xs = np.where(
            mask > 0
        )

        if len(xs) == 0:
            return None

        x1 = int(xs.min())
        y1 = int(ys.min())
        x2 = int(xs.max())
        y2 = int(ys.max())

        return (
            x1,
            y1,
            x2,
            y2
        )


    # --------------------------------------------------
    # CROP HAIR FROM REFERENCE
    # --------------------------------------------------

    def extract_reference_hair(
        self,
        reference,
        reference_mask
    ):

        bbox = self.get_bbox(
            reference_mask
        )

        if bbox is None:
            raise ValueError(
                "No hairstyle detected "
                "in reference image."
            )

        x1, y1, x2, y2 = bbox

        # Padding around hair
        padding = 15

        x1 = max(
            0,
            x1 - padding
        )

        y1 = max(
            0,
            y1 - padding
        )

        x2 = min(
            reference.shape[1] - 1,
            x2 + padding
        )

        y2 = min(
            reference.shape[0] - 1,
            y2 + padding
        )

        hair = reference[
            y1:y2 + 1,
            x1:x2 + 1
        ]

        mask = reference_mask[
            y1:y2 + 1,
            x1:x2 + 1
        ]

        return hair, mask


    # --------------------------------------------------
    # RESIZE REFERENCE HAIR
    # --------------------------------------------------

    def resize_reference_hair(
        self,
        hair,
        mask,
        target_bbox
    ):

        tx1, ty1, tx2, ty2 = (
            target_bbox
        )

        target_width = (
            tx2 - tx1 + 1
        )

        target_height = (
            ty2 - ty1 + 1
        )

        # New hairstyle should be
        # slightly larger than existing hair.
        new_width = max(
            int(
                target_width
                * self.WIDTH_SCALE
            ),
            50
        )

        new_height = max(
            int(
                target_height
                * self.HEIGHT_SCALE
            ),
            50
        )

        resized_hair = cv2.resize(
            hair,
            (
                new_width,
                new_height
            ),
            interpolation=cv2.INTER_CUBIC
        )

        resized_mask = cv2.resize(
            mask,
            (
                new_width,
                new_height
            ),
            interpolation=cv2.INTER_LINEAR
        )

        return (
            resized_hair,
            resized_mask
        )


    # --------------------------------------------------
    # REMOVE OLD HAIR
    # --------------------------------------------------

    def remove_old_hair(
        self,
        image,
        hair_mask
    ):

        # Expand the mask slightly so that
        # dark old-hair edges don't remain.
        kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE,
            (9, 9)
        )

        removal_mask = cv2.dilate(
            hair_mask,
            kernel,
            iterations=1
        )

        # Inpaint old hair area.
        cleaned = cv2.inpaint(
            image,
            removal_mask,
            self.INPAINT_RADIUS,
            cv2.INPAINT_TELEA
        )

        return cleaned


    # --------------------------------------------------
    # COLOR ADJUSTMENT
    # --------------------------------------------------

    def adjust_hair_color(
        self,
        hair,
        target_region,
        mask
    ):

        mask_bool = (
            mask > 100
        )

        if np.sum(mask_bool) < 100:
            return hair

        source = (
            hair.astype(np.float32)
        )

        target = (
            target_region.astype(
                np.float32
            )
        )

        source_pixels = source[
            mask_bool
        ]

        target_pixels = target[
            mask_bool
        ]

        if len(source_pixels) == 0:
            return hair

        src_mean = (
            np.mean(
                source_pixels,
                axis=0
            )
        )

        tgt_mean = (
            np.mean(
                target_pixels,
                axis=0
            )
        )

        difference = (
            tgt_mean - src_mean
        )

        # Only a gentle adjustment.
        source += (
            difference * 0.15
        )

        return np.clip(
            source,
            0,
            255
        ).astype(np.uint8)


    # --------------------------------------------------
    # SOFT ALPHA MASK
    # --------------------------------------------------

    def create_alpha(
        self,
        mask
    ):

        if self.BLUR_SIZE % 2 == 0:
            blur = (
                self.BLUR_SIZE + 1
            )
        else:
            blur = self.BLUR_SIZE

        alpha = cv2.GaussianBlur(
            mask,
            (
                blur,
                blur
            ),
            0
        )

        alpha = (
            alpha.astype(
                np.float32
            )
            / 255.0
        )

        return alpha


    # --------------------------------------------------
    # PLACE NEW HAIR
    # --------------------------------------------------

    def place_new_hair(
        self,
        background,
        hair,
        hair_mask,
        target_bbox
    ):

        result = background.copy()

        tx1, ty1, tx2, ty2 = (
            target_bbox
        )

        target_width = (
            tx2 - tx1 + 1
        )

        target_center_x = (
            tx1 + tx2
        ) // 2

        hair_height, hair_width = (
            hair_mask.shape
        )

        # ----------------------------------------------
        # Position
        # ----------------------------------------------

        # Align horizontal center
        x = (
            target_center_x
            - hair_width // 2
        )

        # Start slightly above the
        # detected original hair.
        y = (
            ty1
            - int(
                hair_height
                * 0.08
            )
        )

        # ----------------------------------------------
        # Keep inside image
        # ----------------------------------------------

        canvas_h, canvas_w = (
            background.shape[:2]
        )

        x1 = max(
            0,
            x
        )

        y1 = max(
            0,
            y
        )

        x2 = min(
            canvas_w,
            x + hair_width
        )

        y2 = min(
            canvas_h,
            y + hair_height
        )

        if x1 >= x2 or y1 >= y2:
            return result

        # Hair crop coordinates
        hx1 = (
            x1 - x
        )

        hy1 = (
            y1 - y
        )

        hx2 = (
            hx1
            + (x2 - x1)
        )

        hy2 = (
            hy1
            + (y2 - y1)
        )

        hair_crop = hair[
            hy1:hy2,
            hx1:hx2
        ]

        mask_crop = hair_mask[
            hy1:hy2,
            hx1:hx2
        ]

        background_crop = background[
            y1:y2,
            x1:x2
        ]

        # ----------------------------------------------
        # Alpha
        # ----------------------------------------------

        alpha = self.create_alpha(
            mask_crop
        )

        alpha = np.expand_dims(
            alpha,
            axis=2
        )

        # ----------------------------------------------
        # Blend
        # ----------------------------------------------

        blended = (
            hair_crop.astype(
                np.float32
            )
            * alpha
            +
            background_crop.astype(
                np.float32
            )
            * (1.0 - alpha)
        )

        result[
            y1:y2,
            x1:x2
        ] = np.clip(
            blended,
            0,
            255
        ).astype(np.uint8)

        return result


    # --------------------------------------------------
    # SAVE DEBUG MASKS
    # --------------------------------------------------

    def save_debug(
        self,
        target,
        target_mask,
        reference,
        reference_mask
    ):

        cv2.imwrite(
            str(
                self.OUTPUT_DIR
                / "debug_target_hair_mask.png"
            ),
            target_mask
        )

        cv2.imwrite(
            str(
                self.OUTPUT_DIR
                / "debug_reference_hair_mask.png"
            ),
            reference_mask
        )

        # Visual target mask
        target_overlay = target.copy()

        target_overlay[
            target_mask > 0
        ] = (
            target_overlay[
                target_mask > 0
            ] * 0.4
            + np.array(
                [0, 255, 0],
                dtype=np.float32
            ) * 0.6
        ).astype(np.uint8)

        cv2.imwrite(
            str(
                self.OUTPUT_DIR
                / "debug_target_overlay.png"
            ),
            target_overlay
        )


    # --------------------------------------------------
    # MAIN TRANSFORMATION
    # --------------------------------------------------

    def transform(
        self,
        target_path,
        hairstyle_path,
        output_path=None
    ):

        print()
        print("=" * 60)
        print("LIGHTWEIGHT HAIRSTYLE TRANSFORMATION")
        print("=" * 60)

        print(
            "Target:",
            target_path
        )

        print(
            "Reference:",
            hairstyle_path
        )

        # ----------------------------------------------
        # LOAD
        # ----------------------------------------------

        target = self.load_image(
            target_path
        )

        reference = self.load_image(
            hairstyle_path
        )

        print(
            "Target size:",
            target.shape[:2]
        )

        print(
            "Reference size:",
            reference.shape[:2]
        )

        # ----------------------------------------------
        # TARGET HAIR
        # ----------------------------------------------

        print(
            "Detecting target hair..."
        )

        target_mask = (
            self.get_hair_mask(
                target
            )
        )

        target_mask = (
            self.largest_component(
                target_mask
            )
        )

        target_pixels = int(
            np.sum(
                target_mask > 0
            )
        )

        print(
            "Target hair pixels:",
            target_pixels
        )

        if target_pixels < 1000:
            raise ValueError(
                "Could not detect enough "
                "hair in target image."
            )

        target_bbox = (
            self.get_bbox(
                target_mask
            )
        )

        print(
            "Target hair bbox:",
            target_bbox
        )

        # ----------------------------------------------
        # REFERENCE HAIR
        # ----------------------------------------------

        print(
            "Detecting reference hairstyle..."
        )

        reference_mask = (
            self.get_hair_mask(
                reference
            )
        )

        reference_mask = (
            self.largest_component(
                reference_mask
            )
        )

        reference_pixels = int(
            np.sum(
                reference_mask > 0
            )
        )

        print(
            "Reference hair pixels:",
            reference_pixels
        )

        if reference_pixels < 1000:
            raise ValueError(
                "Could not detect enough "
                "hair in reference image."
            )

        # ----------------------------------------------
        # DEBUG
        # ----------------------------------------------

        self.save_debug(
            target,
            target_mask,
            reference,
            reference_mask
        )

        # ----------------------------------------------
        # EXTRACT REFERENCE HAIR
        # ----------------------------------------------

        print(
            "Extracting hairstyle..."
        )

        reference_hair, reference_hair_mask = (
            self.extract_reference_hair(
                reference,
                reference_mask
            )
        )

        # ----------------------------------------------
        # RESIZE
        # ----------------------------------------------

        print(
            "Sizing hairstyle..."
        )

        fitted_hair, fitted_mask = (
            self.resize_reference_hair(
                reference_hair,
                reference_hair_mask,
                target_bbox
            )
        )

        print(
            "Fitted size:",
            fitted_hair.shape[:2]
        )

        # ----------------------------------------------
        # REMOVE OLD HAIR
        # ----------------------------------------------

        print(
            "Removing existing hairstyle..."
        )

        cleaned_target = (
            self.remove_old_hair(
                target,
                target_mask
            )
        )

        # ----------------------------------------------
        # PLACE NEW HAIR
        # ----------------------------------------------

        print(
            "Placing new hairstyle..."
        )

        result = self.place_new_hair(
            cleaned_target,
            fitted_hair,
            fitted_mask,
            target_bbox
        )

        # ----------------------------------------------
        # OUTPUT
        # ----------------------------------------------

        if output_path is None:

            output_path = (
                self.OUTPUT_DIR
                / "try_on_result.png"
            )

        output_path = Path(
            output_path
        )

        output_path.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        cv2.imwrite(
            str(output_path),
            result
        )

        print()
        print("=" * 60)
        print("TRANSFORMATION SUCCESSFUL")
        print("=" * 60)

        print(
            "Result:",
            output_path
        )

        print(
            "Local AI model: 0.75 MB"
        )

        return str(output_path)


# ======================================================
# GLOBAL INSTANCE
# ======================================================

hairstyle_try_on = HairstyleTryOn()


# ======================================================
# TEST
# ======================================================

if __name__ == "__main__":

    PROJECT_ROOT = (
        Path(__file__).resolve().parents[2]
    )

    # User's normal photo
    target = (
        PROJECT_ROOT
        / "data"
        / "raw"
        / "face"
        / "image.png"
    )

    # Use the clean reference we created.
    # This avoids processing the entire collage.
    reference = (
        PROJECT_ROOT
        / "backend"
        / "try_on"
        / "curly_reference.png"
    )

    output = (
        PROJECT_ROOT
        / "backend"
        / "try_on"
        / "outputs"
        / "curly_textured_try_on_v2.png"
    )

    hairstyle_try_on.transform(
        target,
        reference,
        output
    )