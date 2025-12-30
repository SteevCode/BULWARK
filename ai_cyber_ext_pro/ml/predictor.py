# ml/predictor.py
import joblib
import os
import re
from django.conf import settings

MODEL_PATH = getattr(settings, 'MODEL_PATH', os.path.join(os.path.dirname(__file__), '..', 'models', 'url_model.joblib'))

class URLModel:
    def __init__(self):
        try:
            data = joblib.load(MODEL_PATH)
            self.model = data['model']
            self.tfidf = data['tfidf']
            print("Loaded model from", MODEL_PATH)
        except Exception as e:
            print("Could not load model:", e)
            self.model = None
            self.tfidf = None

    def predict_proba(self, urls):
        if not self.model or not self.tfidf:
            # fallback heuristic score 0..1
            return [self.heuristic(u) for u in urls]
        X = self.tfidf.transform(urls)
        probs = self.model.predict_proba(X)[:, 1]
        return probs.tolist()

    @staticmethod
    def heuristic(url):
        score = 0.0
        if re.search(r'\d+\.\d+\.\d+\.\d+', url): score += 0.4
        if len(url) > 75: score += 0.2
        for token in ['login','verify','secure','bank','account','update']:
            if token in url.lower():
                score += 0.15
        return min(score, 0.99)
