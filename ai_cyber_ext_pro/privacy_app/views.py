# privacy_app/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests
import re

# HuggingFace Summarizer (simple pipeline)
from transformers import pipeline
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# Helper: keyword extraction
def extract_keywords(text):
    keywords = {}
    if re.search(r"collect|gather|data|information", text, re.I):
        keywords['data_collection'] = True
    if re.search(r"use|process|purpose", text, re.I):
        keywords['data_usage'] = True
    if re.search(r"share|third party|affiliate", text, re.I):
        keywords['third_party_sharing'] = True
    if re.search(r"cookie|tracking", text, re.I):
        keywords['cookies_tracking'] = True
    return keywords

@api_view(["POST"])
def analyze_privacy(request):
    """
    API: POST /api/analyze-privacy/
    Body: { "url": "https://somesite.com/privacy" }
    or   { "text": "privacy policy text here..." }
    """
    url = request.data.get("url", "")
    text = request.data.get("text", "")

    # Case 1: fetch privacy page from URL
    if url and not text:
        try:
            resp = requests.get(url, timeout=5)
            text = resp.text
        except:
            return Response({"error": "Failed to fetch privacy policy"}, status=400)

    if not text:
        return Response({"error": "No text provided"}, status=400)

    # Summarization (HuggingFace)
    try:
        summary = summarizer(text[:2000], max_length=120, min_length=40, do_sample=False)[0]['summary_text']
    except Exception:
        summary = "Could not summarize (too large or error)."

    # Extract keywords
    keywords = extract_keywords(text)

    return Response({
        "summary": summary,
        "keywords": keywords,
        "length": len(text),
    })
