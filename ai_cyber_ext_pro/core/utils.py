import requests
import base64
import time

# Put your actual VirusTotal API key here (no extra text)
VT_API_KEY = "df22122ed387caa8a7c2e64eea9fdcf4ac3a2ea478427e4f02b28680780fdb55"
VT_URL = "https://www.virustotal.com/api/v3/urls"

def check_with_virustotal(url: str, retries: int = 3, delay: int = 5):
    """
    Returns VirusTotal risk score (0.0-1.0),
    "pending" if the scan isn't ready yet, or None if an error occurs.
    """
    try:
        # Encode URL for VT
        url_bytes = url.encode()
        url_b64 = base64.urlsafe_b64encode(url_bytes).decode().strip("=")

        # Submit URL for scanning
        resp = requests.post(
            VT_URL,
            headers={"x-apikey": VT_API_KEY},
            data={"url": url}
        )
        resp.raise_for_status()

        # Fetch report, retry if not ready
        for _ in range(retries):
            report = requests.get(f"{VT_URL}/{url_b64}", headers={"x-apikey": VT_API_KEY})
            report.raise_for_status()
            stats = report.json()["data"]["attributes"]["last_analysis_stats"]

            total = sum(stats.values())
            if total > 0:
                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)
                score = ((malicious + suspicious) / total) * 100
                return round(score, 2)
            else:
                time.sleep(delay)

        return "pending"  # If still not ready

    except requests.exceptions.HTTPError as e:
        print("VT ERROR HTTP:", e)
        return None
    except Exception as e:
        print("VT ERROR:", e)
        return None
