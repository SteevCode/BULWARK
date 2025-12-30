# ml/train_model.py
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# 🔹 Step 1: Create a small dataset (for demo)
df = pd.read_csv("data/phishing.csv")
# data = {
#     "url": [
#         "paypal-login-secure.com", 
#         "facebook-security-alert.com",
#         "update-banking-info.net",
#         "google.com",
#         "github.com",
#         "wikipedia.org"
#     ],
#     "label": [1, 1, 1, 0, 0, 0]  # 1 = phishing, 0 = safe
# }

# df = pd.DataFrame(data)

# 🔹 Step 2: Convert URLs into features
URL_COLUMN = "URL"
LABEL_COLUMN = "type"   # 0 = safe, 1 = phishing

# Build lookup sets
phishing_urls = set(df[df[LABEL_COLUMN] == 1][URL_COLUMN].astype(str).tolist())
safe_urls = set(df[df[LABEL_COLUMN] == 0][URL_COLUMN].astype(str).tolist())

@method_decorator(csrf_exempt, name='dispatch')
class PredictRiskView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            url = data.get("url", "").strip()

            if not url:
                return JsonResponse({"error": "No URL provided"}, status=400)

            # Check risk level
            if url in phishing_urls:
                return JsonResponse({
                    "url": url,
                    "risk": "High",
                    "score": 0.95,
                    "found_in_dataset": True
                })
            elif url in safe_urls:
                return JsonResponse({
                    "url": url,
                    "risk": "Low",
                    "score": 0.05,
                    "found_in_dataset": True
                })
            else:
                return JsonResponse({
                    "url": url,
                    "risk": "Unknown",
                    "score": 0.5,
                    "found_in_dataset": False
                })

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
