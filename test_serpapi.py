import os
import requests
from dotenv import load_dotenv

# Load backend/.env
env_path = os.path.join(
    os.path.dirname(__file__),
    "backend",
    ".env"
)

load_dotenv(env_path)

API_KEY = os.getenv("SERPAPI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "SERPAPI_API_KEY not found in backend/.env"
    )

params = {
    "engine": "google_maps",
    "type": "search",
    "q": "salons in Hubli",
    "ll": "@15.3647,75.1240,14z",
    "hl": "en",
    "api_key": API_KEY,
}

response = requests.get(
    "https://serpapi.com/search",
    params=params,
    timeout=30,
)

print("HTTP STATUS:", response.status_code)

data = response.json()

if "error" in data:
    print("\nSERPAPI ERROR:")
    print(data["error"])
    raise SystemExit

results = data.get("local_results", [])

print(f"\nFOUND: {len(results)} salons\n")

for i, shop in enumerate(results, 1):
    print("=" * 60)
    print(f"{i}. {shop.get('title', 'Unknown')}")
    print(f"Address : {shop.get('address', 'N/A')}")
    print(f"Rating  : {shop.get('rating', 'N/A')}")
    print(f"Reviews : {shop.get('reviews', 'N/A')}")
    print(f"Phone   : {shop.get('phone', 'N/A')}")
    print(f"Type    : {shop.get('type', 'N/A')}")

    gps = shop.get("gps_coordinates", {})

    print(f"Latitude : {gps.get('latitude', 'N/A')}")
    print(f"Longitude: {gps.get('longitude', 'N/A')}")

    links = shop.get("links", {})
    print(f"Maps    : {links.get('directions', 'N/A')}")

print("\nTEST COMPLETED.")