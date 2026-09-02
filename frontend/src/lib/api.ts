const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export interface HealthResponse {
  name?: string;
  status: string;
  service?: string;
  version?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  face_shape: FaceShape;
  confidence: number;
  raw_confidence: number;
  probabilities: Record<FaceShape, number>;
  features_used: number;
}

export type FaceShape =
  | "heart"
  | "oblong"
  | "oval"
  | "round"
  | "square";

export type Gender = "men" | "women";

export interface HairstyleRecommendation {
  id: string;
  name: string;
  gender: Gender;
  length: string;
  textures: string[];
  match_score: number;
  maintenance: string;
  tags: string[];
  try_on_ready: boolean;
}

export interface RecommendationResponse {
  success: boolean;
  face_shape: FaceShape;
  gender: Gender;
  count: number;
  recommendations: HairstyleRecommendation[];
}

/* -------------------------------------------------------
   HEALTH
------------------------------------------------------- */

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to connect to HairVision AI API");
  }

  return response.json();
}

/* -------------------------------------------------------
   FACE ANALYSIS
------------------------------------------------------- */

export async function analyzeFace(
  file: File,
): Promise<AnalyzeResponse> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Face analysis failed.";

    try {
      const data = await response.json();

      if (typeof data?.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(message);
  }

  return response.json();
}

/* -------------------------------------------------------
   HAIRSTYLE RECOMMENDATIONS
------------------------------------------------------- */

export async function getRecommendations(
  faceShape: FaceShape,
  gender: Gender,
  limit = 8,
): Promise<RecommendationResponse> {
  const response = await fetch(`${API_URL}/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      face_shape: faceShape,
      gender,
      limit,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Unable to generate hairstyle recommendations.";

    try {
      const data = await response.json();

      if (typeof data?.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(message);
  }

  return response.json();
}