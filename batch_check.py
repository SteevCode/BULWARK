import requests
import time
from concurrent.futures import ThreadPoolExecutor

API_URL = "http://127.0.0.1:8000/api/predict-risk/"

# Mixed list from user's request
URLS = [
    # --- Suspected Phishing / malicious ---
    "https://pack-king.nl/wp-content/plugins/astra-sites/admin/bsf-analytics/modules/deactivation-survey/classes/de/info.php",
    "https://robiox.com.af/games/109983668079237/SKIBIDI-Steal-a-Brainrot?privateServerLinkCode=60290768689256836349005291940369",
    "http://www.ilerisideniz.ooguy.com/",
    "https://staenconnunity.com/activation=YeuaJj1EA1",
    "http://jamalonaoker1766706932520.0280245.misitiohostgator.com/NA/NRD/90b6d23/Sign_in.php",
    "https://robloxt.com.es/users/1323848505/profile",
    "https://shortlink.st/X6hB-hAQ",
    "http://netflix.plantinternational.de/test/",
    "https://rbfcu-star.azurewebsites.net/(S(oz1nyhe1lud4oqoq43sqavl1))/Main/Login/",
    
    # --- Legitimate / Safe ---
    "https://www.google.com",
    "https://www.youtube.com",
    "https://www.amazon.com",
    "https://www.facebook.com",
    "https://www.wikipedia.org",
    "https://www.netflix.com",
    "https://github.com",
    "https://stackoverflow.com",
    "https://www.microsoft.com",
    "https://www.apple.com"
]

def check_url(url):
    try:
        start = time.time()
        response = requests.get(API_URL, params={"url": url}, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            risk = data.get('risk', 'Unknown')
            risk_score = data.get('risk_score', 0)
            return {
                "url": url,
                "status": "Online",
                "risk": risk,
                "score": risk_score,
                "time": f"{elapsed:.2f}s"
            }
        else:
            return {"url": url, "status": f"Error {response.status_code}", "risk": "N/A", "score": "N/A"}
    except requests.exceptions.ConnectionError:
        return {"url": url, "status": "Connection Failed (Server Offline?)", "risk": "N/A", "score": "N/A"}
    except Exception as e:
        return {"url": url, "status": f"Error: {str(e)}", "risk": "N/A", "score": "N/A"}

def run_tests():
    print(f"{'URL':<60} | {'Status':<10} | {'Risk':<20} | {'Score':<5} | {'Time'}")
    print("-" * 115)
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = executor.map(check_url, URLS)
        
        for res in results:
            url_display = res['url'][:57] + "..." if len(res['url']) > 57 else res['url']
            print(f"{url_display:<60} | {res['status']:<10} | {res['risk']:<20} | {str(res['score']):<5} | {res.get('time', '-')}")

if __name__ == "__main__":
    print("Running Batch Diagnostic on Local AI Server...")
    run_tests()
