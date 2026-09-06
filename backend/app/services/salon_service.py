import math
import os
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv


# =========================================================
# ENVIRONMENT
# =========================================================

PROJECT_ROOT = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
    )
)

ENV_PATH = os.path.join(
    PROJECT_ROOT,
    "backend",
    ".env",
)

load_dotenv(ENV_PATH)

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

SERPAPI_URL = "https://serpapi.com/search"
SERPAPI_LOCATIONS_URL = "https://serpapi.com/locations.json"


# =========================================================
# CONSTANTS
# =========================================================

DEFAULT_RADIUS_METERS = 5000
MAX_RADIUS_METERS = 10000

DEFAULT_LIMIT = 20
MAX_LIMIT = 50

MAX_PAGES = 3


# =========================================================
# VALIDATION
# =========================================================

def validate_coordinates(
    latitude: float,
    longitude: float,
) -> None:

    if not -90 <= latitude <= 90:
        raise ValueError(
            "Latitude must be between -90 and 90."
        )

    if not -180 <= longitude <= 180:
        raise ValueError(
            "Longitude must be between -180 and 180."
        )


def validate_radius(
    radius_meters: int,
) -> None:

    if radius_meters < 500:
        raise ValueError(
            "Radius must be at least 500 meters."
        )

    if radius_meters > MAX_RADIUS_METERS:
        raise ValueError(
            f"Radius cannot exceed "
            f"{MAX_RADIUS_METERS} meters."
        )


# =========================================================
# HAVERSINE DISTANCE
# =========================================================

def calculate_distance_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:

    earth_radius = 6371000

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(
        lat2 - lat1
    )

    delta_lon = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(delta_lat / 2) ** 2
        +
        math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )

    return earth_radius * c


# =========================================================
# FORMAT DISTANCE
# =========================================================

def format_distance(
    distance_meters: float,
) -> str:

    if distance_meters < 1000:
        return f"{round(distance_meters)} m"

    return f"{distance_meters / 1000:.1f} km"


# =========================================================
# GOOGLE MAPS DIRECTIONS URL
# =========================================================

def create_maps_url(
    latitude: float,
    longitude: float,
) -> str:

    return (
        "https://www.google.com/maps/dir/?api=1"
        f"&destination={latitude},{longitude}"
    )


# =========================================================
# SAFE STRING
# =========================================================

def safe_string(
    value: Any,
    default: str = "",
) -> str:

    if value is None:
        return default

    return str(value).strip()


# =========================================================
# EXTRACT GPS
# =========================================================

def extract_coordinates(
    result: Dict[str, Any],
) -> Tuple[Optional[float], Optional[float]]:

    gps = result.get(
        "gps_coordinates"
    )

    if not isinstance(gps, dict):
        return None, None

    latitude = gps.get("latitude")
    longitude = gps.get("longitude")

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return None, None

    if not -90 <= latitude <= 90:
        return None, None

    if not -180 <= longitude <= 180:
        return None, None

    return latitude, longitude


# =========================================================
# EXTRACT PHONE
# =========================================================

def extract_phone(
    result: Dict[str, Any],
) -> str:

    phone = result.get("phone")

    if phone:
        return safe_string(phone)

    phone_number = result.get(
        "phone_number"
    )

    if phone_number:
        return safe_string(
            phone_number
        )

    return ""


# =========================================================
# EXTRACT WEBSITE
# =========================================================

def extract_website(
    result: Dict[str, Any],
) -> str:

    website = result.get(
        "website"
    )

    if website:
        return safe_string(
            website
        )

    links = result.get(
        "links"
    )

    if isinstance(links, dict):

        website = links.get(
            "website"
        )

        if website:
            return safe_string(
                website
            )

    return ""


# =========================================================
# EXTRACT HOURS
# =========================================================

def extract_hours(
    result: Dict[str, Any],
):

    hours = result.get(
        "hours"
    )

    if isinstance(hours, list):
        return hours

    if isinstance(hours, dict):
        return hours

    return None


# =========================================================
# EXTRACT OPEN STATUS
# =========================================================

def extract_open_status(
    result: Dict[str, Any],
) -> str:

    if "open_state" in result:

        return safe_string(
            result.get(
                "open_state"
            )
        )

    if "open_now" in result:

        value = result.get(
            "open_now"
        )

        if isinstance(value, bool):

            return (
                "Open now"
                if value
                else "Closed"
            )

        return safe_string(
            value
        )

    return ""


# =========================================================
# SEARCH SERPAPI GOOGLE MAPS
# =========================================================

def search_serpapi(
    latitude: float,
    longitude: float,
    start: int = 0,
) -> Dict[str, Any]:

    if not SERPAPI_API_KEY:

        raise RuntimeError(
            "SERPAPI_API_KEY is missing "
            "from backend/.env"
        )

    params = {
        "engine": "google_maps",
        "type": "search",

        "q": "salons",

        "ll": (
            f"@{latitude},"
            f"{longitude},14z"
        ),

        "hl": "en",

        "api_key": SERPAPI_API_KEY,
    }

    if start > 0:
        params["start"] = start

    try:

        response = requests.get(
            SERPAPI_URL,
            params=params,
            timeout=30,
        )

    except requests.RequestException as exc:

        raise RuntimeError(
            "Unable to connect to "
            f"SerpApi: {exc}"
        )

    if response.status_code != 200:

        raise RuntimeError(
            "SerpApi returned HTTP "
            f"{response.status_code}: "
            f"{response.text[:500]}"
        )

    try:

        data = response.json()

    except ValueError:

        raise RuntimeError(
            "SerpApi returned invalid JSON."
        )

    if "error" in data:

        raise RuntimeError(
            f"SerpApi error: "
            f"{data['error']}"
        )

    return data


# =========================================================
# LOCATION SEARCH
# =========================================================

def search_location(
    query: str,
) -> Dict[str, Any]:
    """
    Convert any user-entered location into
    latitude and longitude.

    Examples:

        Hubli
        Bangalore
        Bengaluru
        Dharwad
        Indiranagar Bangalore
        Mumbai
        Karnataka
        Maharashtra
        Delhi
        MG Road Bangalore

    First uses SerpApi Locations API.
    Then falls back to Google Maps search.
    """

    if not query or not query.strip():

        raise ValueError(
            "Location search cannot be empty."
        )

    if not SERPAPI_API_KEY:

        raise RuntimeError(
            "SERPAPI_API_KEY is missing "
            "from backend/.env"
        )

    query = query.strip()

    # -----------------------------------------------------
    # STEP 1
    # SERPAPI LOCATIONS API
    # -----------------------------------------------------

    try:

        response = requests.get(
            SERPAPI_LOCATIONS_URL,
            params={
                "q": query,
                "limit": 10,
            },
            timeout=20,
        )

    except requests.RequestException as exc:

        raise RuntimeError(
            "Unable to connect to "
            f"SerpApi Locations API: {exc}"
        )

    if response.status_code != 200:

        raise RuntimeError(
            "SerpApi Locations API returned "
            f"HTTP {response.status_code}: "
            f"{response.text[:500]}"
        )

    try:

        locations = response.json()

    except ValueError:

        raise RuntimeError(
            "SerpApi Locations API returned "
            "invalid JSON."
        )

    # -----------------------------------------------------
    # STEP 2
    # FIND BEST LOCATION
    # -----------------------------------------------------

    if isinstance(
        locations,
        list,
    ):

        candidates = []

        for item in locations:

            if not isinstance(
                item,
                dict,
            ):
                continue

            gps = item.get(
                "gps"
            )

            if not isinstance(
                gps,
                list,
            ):
                continue

            if len(gps) < 2:
                continue

            try:

                longitude = float(
                    gps[0]
                )

                latitude = float(
                    gps[1]
                )

            except (
                TypeError,
                ValueError,
            ):

                continue

            if not (
                -90
                <= latitude
                <= 90
            ):
                continue

            if not (
                -180
                <= longitude
                <= 180
            ):
                continue

            candidates.append(
                {
                    "item": item,
                    "latitude": latitude,
                    "longitude": longitude,
                }
            )

        if candidates:

            # Prefer exact city/location results
            # over large DMA/region results.

            preferred_types = {
                "City": 0,
                "Neighborhood": 1,
                "District": 2,
                "County": 3,
                "State": 4,
                "Province": 5,
                "Country": 6,
                "DMA Region": 7,
            }

            def location_score(
                candidate
            ):

                item = candidate[
                    "item"
                ]

                target_type = item.get(
                    "target_type",
                    "",
                )

                type_score = (
                    preferred_types.get(
                        target_type,
                        10,
                    )
                )

                reach = item.get(
                    "reach",
                    0,
                )

                try:
                    reach = int(reach)
                except (
                    TypeError,
                    ValueError,
                ):
                    reach = 0

                # Lower type score is more important.
                # Reach breaks ties.

                return (
                    type_score,
                    -reach,
                )

            candidates.sort(
                key=location_score
            )

            best = candidates[0]

            item = best[
                "item"
            ]

            return {
                "success": True,
                "query": query,
                "name": safe_string(
                    item.get(
                        "name"
                    ),
                    query,
                ),
                "canonical_name": safe_string(
                    item.get(
                        "canonical_name"
                    ),
                    query,
                ),
                "latitude": best[
                    "latitude"
                ],
                "longitude": best[
                    "longitude"
                ],
                "target_type": safe_string(
                    item.get(
                        "target_type"
                    )
                ),
                "country_code": safe_string(
                    item.get(
                        "country_code"
                    )
                ),
                "source": (
                    "SerpApi Locations API"
                ),
            }

    # -----------------------------------------------------
    # STEP 3
    # GOOGLE MAPS FALLBACK
    # -----------------------------------------------------

    try:

        response = requests.get(
            SERPAPI_URL,
            params={
                "engine": "google_maps",
                "type": "search",
                "q": query,
                "hl": "en",
                "api_key": SERPAPI_API_KEY,
            },
            timeout=30,
        )

    except requests.RequestException as exc:

        raise RuntimeError(
            "Unable to search Google Maps "
            f"through SerpApi: {exc}"
        )

    if response.status_code != 200:

        raise RuntimeError(
            "Google Maps location search "
            f"returned HTTP "
            f"{response.status_code}: "
            f"{response.text[:500]}"
        )

    try:

        data = response.json()

    except ValueError:

        raise RuntimeError(
            "Google Maps location search "
            "returned invalid JSON."
        )

    if "error" in data:

        raise RuntimeError(
            f"SerpApi error: "
            f"{data['error']}"
        )

    # -----------------------------------------------------
    # PLACE RESULTS
    # -----------------------------------------------------

    place = data.get(
        "place_results"
    )

    if isinstance(
        place,
        dict,
    ):

        gps = place.get(
            "gps_coordinates"
        )

        if isinstance(
            gps,
            dict,
        ):

            latitude = gps.get(
                "latitude"
            )

            longitude = gps.get(
                "longitude"
            )

            if (
                latitude is not None
                and longitude is not None
            ):

                return {
                    "success": True,
                    "query": query,
                    "name": safe_string(
                        place.get(
                            "title"
                        ),
                        query,
                    ),
                    "canonical_name": safe_string(
                        place.get(
                            "address"
                        ),
                        query,
                    ),
                    "latitude": float(
                        latitude
                    ),
                    "longitude": float(
                        longitude
                    ),
                    "target_type": "Place",
                    "country_code": "",
                    "source": (
                        "Google Maps via SerpApi"
                    ),
                }

    # -----------------------------------------------------
    # LOCAL RESULTS
    # -----------------------------------------------------

    local_results = data.get(
        "local_results",
        [],
    )

    if isinstance(
        local_results,
        list,
    ):

        for result in local_results:

            if not isinstance(
                result,
                dict,
            ):
                continue

            gps = result.get(
                "gps_coordinates"
            )

            if not isinstance(
                gps,
                dict,
            ):
                continue

            latitude = gps.get(
                "latitude"
            )

            longitude = gps.get(
                "longitude"
            )

            if (
                latitude is None
                or longitude is None
            ):
                continue

            return {
                "success": True,
                "query": query,
                "name": safe_string(
                    result.get(
                        "title"
                    ),
                    query,
                ),
                "canonical_name": safe_string(
                    result.get(
                        "address"
                    ),
                    query,
                ),
                "latitude": float(
                    latitude
                ),
                "longitude": float(
                    longitude
                ),
                "target_type": "Place",
                "country_code": "",
                "source": (
                    "Google Maps via SerpApi"
                ),
            }

    raise ValueError(
        f'Could not find a location '
        f'for "{query}". '
        "Try a more specific city, "
        "area, landmark or address."
    )


# =========================================================
# NORMALIZE SALON RESULT
# =========================================================

def normalize_salon(
    result: Dict[str, Any],
    user_latitude: float,
    user_longitude: float,
) -> Optional[Dict[str, Any]]:

    latitude, longitude = (
        extract_coordinates(
            result
        )
    )

    if (
        latitude is None
        or longitude is None
    ):
        return None

    distance = (
        calculate_distance_meters(
            user_latitude,
            user_longitude,
            latitude,
            longitude,
        )
    )

    title = safe_string(
        result.get(
            "title"
        ),
        "Unknown Salon",
    )

    address = safe_string(
        result.get(
            "address"
        ),
        "Address unavailable",
    )

    rating = result.get(
        "rating"
    )

    try:

        rating = float(
            rating
        )

    except (
        TypeError,
        ValueError,
    ):

        rating = None

    reviews = result.get(
        "reviews"
    )

    try:

        reviews = int(
            reviews
        )

    except (
        TypeError,
        ValueError,
    ):

        reviews = 0

    phone = extract_phone(
        result
    )

    website = extract_website(
        result
    )

    hours = extract_hours(
        result
    )

    open_status = (
        extract_open_status(
            result
        )
    )

    place_id = safe_string(
        result.get(
            "place_id"
        )
    )

    data_id = safe_string(
        result.get(
            "data_id"
        )
    )

    thumbnail = safe_string(
        result.get(
            "thumbnail"
        )
    )

    maps_url = create_maps_url(
        latitude,
        longitude,
    )

    return {
        "id": (
            place_id
            or data_id
            or (
                f"{latitude}_"
                f"{longitude}_"
                f"{title}"
            )
        ),

        "name": title,

        "address": address,

        "latitude": latitude,

        "longitude": longitude,

        "rating": rating,

        "rating_count": reviews,

        "phone": phone,

        "website": website,

        "opening_hours": hours,

        "open_status": open_status,

        "distance_meters": round(
            distance
        ),

        "distance": (
            format_distance(
                distance
            )
        ),

        "maps_url": maps_url,

        "place_id": place_id,

        "data_id": data_id,

        "thumbnail": thumbnail,

        "source": (
            "Google Maps via SerpApi"
        ),
    }


# =========================================================
# SEARCH NEARBY SALONS
# =========================================================

def search_nearby_salons(
    latitude: float,
    longitude: float,
    radius_meters: int = DEFAULT_RADIUS_METERS,
    limit: int = DEFAULT_LIMIT,
) -> List[Dict[str, Any]]:

    validate_coordinates(
        latitude,
        longitude,
    )

    validate_radius(
        radius_meters
    )

    if limit < 1:

        raise ValueError(
            "Limit must be at least 1."
        )

    if limit > MAX_LIMIT:

        limit = MAX_LIMIT

    all_results = []

    # -----------------------------------------------------
    # SEARCH MULTIPLE GOOGLE MAPS RESULT PAGES
    # -----------------------------------------------------

    for page in range(
        MAX_PAGES
    ):

        start = page * 20

        data = search_serpapi(
            latitude=latitude,
            longitude=longitude,
            start=start,
        )

        results = data.get(
            "local_results",
            [],
        )

        if not results:
            break

        all_results.extend(
            results
        )

        if len(results) < 20:
            break

    # -----------------------------------------------------
    # NORMALIZE + FILTER
    # -----------------------------------------------------

    salons = []

    seen_ids = set()

    for result in all_results:

        if not isinstance(
            result,
            dict,
        ):
            continue

        salon = normalize_salon(
            result=result,
            user_latitude=latitude,
            user_longitude=longitude,
        )

        if salon is None:
            continue

        # Strict radius filter
        if (
            salon[
                "distance_meters"
            ]
            > radius_meters
        ):
            continue

        unique_id = salon[
            "id"
        ]

        if unique_id in seen_ids:
            continue

        seen_ids.add(
            unique_id
        )

        salons.append(
            salon
        )

    # -----------------------------------------------------
    # SORT BY DISTANCE
    # -----------------------------------------------------

    salons.sort(
        key=lambda item:
        item[
            "distance_meters"
        ]
    )

    return salons[
        :limit
    ]


# =========================================================
# SIMPLE TEST
# =========================================================

if __name__ == "__main__":

    print("=" * 60)
    print(
        "HAIRVISION - LOCATION + SALON TEST"
    )
    print("=" * 60)

    query = input(
        "\nEnter city / area / state / "
        "landmark: "
    ).strip()

    try:

        location = search_location(
            query
        )

        print(
            "\nLOCATION FOUND"
        )

        print(
            "Name:",
            location["name"],
        )

        print(
            "Canonical:",
            location[
                "canonical_name"
            ],
        )

        print(
            "Latitude:",
            location[
                "latitude"
            ],
        )

        print(
            "Longitude:",
            location[
                "longitude"
            ],
        )

        salons = search_nearby_salons(
            latitude=location[
                "latitude"
            ],
            longitude=location[
                "longitude"
            ],
            radius_meters=5000,
            limit=20,
        )

        print(
            f"\nFound {len(salons)} "
            "salons within 5 km.\n"
        )

        for index, salon in enumerate(
            salons,
            start=1,
        ):

            print("-" * 60)

            print(
                f"{index}. "
                f"{salon['name']}"
            )

            print(
                f"Address: "
                f"{salon['address']}"
            )

            print(
                f"Distance: "
                f"{salon['distance']}"
            )

            print(
                f"Rating: "
                f"{salon['rating']}"
            )

            print(
                f"Reviews: "
                f"{salon['rating_count']}"
            )

            print(
                f"Maps: "
                f"{salon['maps_url']}"
            )

    except Exception as exc:

        print(
            f"\nERROR: {exc}"
        )