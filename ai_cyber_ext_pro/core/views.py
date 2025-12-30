from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import validators, requests, re
from ml.predictor import URLModel
from bs4 import BeautifulSoup
# Create your views here.
# core/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
import joblib
from .utils import check_with_virustotal

# Load ML model & vectorizer
# Load ML model & vectorizer
model = joblib.load(settings.MODEL_PATH)
vectorizer = joblib.load(settings.VECTORIZER_PATH)

from .blacklist import PHISHING_BLACKLIST

@api_view(["GET"])
def predict_risk(request):
    print("######################")
    """
    Predicts URL risk using ML + VirusTotal.
    GET parameter: ?url=<url>
    """
    url = request.GET.get("url", "")
    
    # 🔴 DEV TEST CASE
    if "phishing-test" in url:
        return Response({
            "url": url,
            "risk": "Phishing",
            "risk_score": 90
        })

    if not url:
        return Response({"error": "No URL provided"}, status=400)

    # 1. Blocklist Check (Fastest)
    if url in PHISHING_BLACKLIST or url.rstrip('/') in PHISHING_BLACKLIST:
        print(f"URL found in blacklist: {url}")
        return Response({
            "url": url,
            "risk": "Phishing / Unsafe (Blacklisted)",
            "risk_score": 100
        })

    # ML Prediction
    try:
        # Get VT score once
        vt_score = check_with_virustotal(url)
        
        # Handle VT errors/pending
        if not isinstance(vt_score, (int, float)):
             vt_score = 0

        X = vectorizer.transform([url])
        # Get probability (0.0 to 1.0) instead of just class
        risk_prob = model.predict_proba(X)[0][1] * 100 # Convert to percentage
        
        # --- NEW DECISION LOGIC ---
        # Heuristic adjustments
        reasons = []
        final_score = max(risk_prob, vt_score)

        # 1. Feature Analysis (Simple Heuristics for "Explainability")
        if len(url) > 75:
            final_score += 10
            reasons.append("URL is suspiciously long")
        if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
            final_score += 20
            reasons.append("Uses raw IP address")
        if "@" in url:
            final_score += 30
            reasons.append("Contains '@' symbol (obfuscation)")
        if "secure" in url or "login" in url or "verify" in url:
            if final_score > 30: # Only flag if already suspicious
                final_score += 10
                reasons.append("Uses sensitive keywords")

        final_score = min(final_score, 100) # Cap at 100

        # 2. 3-Tier Classification
        if final_score >= 71:
            ml_result = "Phishing / Unsafe"
            action = "block"
        elif final_score >= 41:
            ml_result = "Suspicious"
            action = "warn"
            if not reasons: reasons.append("Statistical anomaly detected")
        else:
            ml_result = "Safe"
            action = "allow"
            
    except Exception as e:
        print(f"Prediction Error: {e}")
        ml_result = "error"
        action = "allow"
        vt_score = 0
        final_score = 0
        reasons = ["Server error during analysis"]

    return Response({
        "url": url,
        "risk": ml_result,
        "risk_score": float(final_score),
        "action": action,
        "reasons": reasons
    })

def analyze_policy(request):
    data = request.data
    url = data.get('url')
    if not url:
        return Response({'error':'missing url'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        r = requests.get(url, timeout=8)
        soup = BeautifulSoup(r.text, 'html.parser')
        # naive: collect long <p> text
        paras = soup.find_all('p')
        texts = [p.get_text().strip() for p in paras if len(p.get_text().strip()) > 50]
        text = ' '.join(texts)[:15000]
        if not text:
            # fallback: page text
            text = soup.get_text()[:15000]
        # simple summarizer: first 3 sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        summary = ' '.join(sentences[:3])
        return Response({'url': url, 'summary': summary})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

