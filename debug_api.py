import requests
import json

urls = [
    "https://1511.us/",
    "https://1511.us/#/",
    "https://dhlcanada.com/"
]

print("-" * 50)
for url in urls:
    api_url = "http://127.0.0.1:8000/api/predict-risk/"
    try:
        response = requests.get(api_url, params={"url": url}, timeout=10)
        print(f"Testing URL: {url}")
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
        print("-" * 50)
    except Exception as e:
        print(f"Error testing {url}: {e}")
