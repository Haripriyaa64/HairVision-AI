// ============================================================
// HAIRVISION AI — API CLIENT
// ============================================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

// ============================================================
// TYPES
// ============================================================

export type FaceShape =
  | "heart"
  | "oblong"
  | "oval"
  | "round"
  | "square";

export type Gender =
  | "men"
  | "women";

export interface AnalyzeResponse {
  success?: boolean;
  face_shape: FaceShape;
  confidence: number;
  probabilities: Record<
    FaceShape,
    number
  >;
}

export interface HairstyleRecommendation {
  id: string;
  name: string;
  gender: Gender;
  length: string;
  textures: string[];
  match_score: number;
  maintenance: string;
  tags: string[];
  try_on_ready?: boolean;
}

export interface TryOnResponse {
  success: boolean;
  hairstyle_id: string;
  hairstyle_name: string;
  gender: Gender;
  image: string;
}

// ============================================================
// HEALTH
// ============================================================

export async function getHealth() {

  const response = await fetch(
    `${API_URL}/health`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Backend unavailable."
    );
  }

  return response.json();
}

// ============================================================
// FACE ANALYSIS
// ============================================================

export async function analyzeFace(
  file: File
): Promise<AnalyzeResponse> {

  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  const response = await fetch(
    `${API_URL}/analyze`,
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    }
  );

  if (!response.ok) {

    let message =
      "Unable to analyze your photo.";

    try {

      const data =
        await response.json();

      message =
        data.detail ||
        message;

    } catch {
      // Keep default message
    }

    throw new Error(message);
  }

  return response.json();
}

// ============================================================
// HAIRSTYLE RECOMMENDATIONS
// ============================================================

export async function getRecommendations(
  faceShape: FaceShape,
  gender: Gender,
  limit: number = 8
): Promise<HairstyleRecommendation[]> {

  const response = await fetch(
    `${API_URL}/recommend`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        face_shape: faceShape,
        gender,
        limit,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {

    let message =
      "Unable to load hairstyle recommendations.";

    try {

      const data =
        await response.json();

      message =
        data.detail ||
        message;

    } catch {
      // Keep default message
    }

    throw new Error(message);
  }

  const data =
    await response.json();

  // Supports both:
  //
  // { recommendations: [...] }
  //
  // and
  //
  // [...]
  //
  // This keeps the frontend compatible
  // with the current backend.

  if (Array.isArray(data)) {
    return data;
  }

  return data.recommendations ?? [];
}

// ============================================================
// AI HAIRSTYLE TRY-ON
// ============================================================

export async function tryOnHairstyle(
  file: File,
  hairstyleId: string,
  gender: Gender
): Promise<TryOnResponse> {

  const formData =
    new FormData();

  formData.append(
    "image",
    file
  );

  formData.append(
    "hairstyle_id",
    hairstyleId
  );

  formData.append(
    "gender",
    gender
  );

  const response = await fetch(
    `${API_URL}/try-on`,
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    }
  );

  if (!response.ok) {

    let message =
      "AI hairstyle generation failed.";

    try {

      const data =
        await response.json();

      message =
        data.detail ||
        message;

    } catch {
      // Keep default message
    }

    throw new Error(message);
  }

  return response.json();
}