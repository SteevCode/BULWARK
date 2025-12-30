import requests
import unittest
import time

API_URL = "http://127.0.0.1:8000/api/predict-risk/"

class TestPhishingBackend(unittest.TestCase):
    def check_url(self, url):
        try:
            start = time.time()
            res = requests.get(API_URL, params={'url': url}, timeout=5)
            duration = (time.time() - start) * 1000
            self.assertEqual(res.status_code, 200)
            data = res.json()
            return data, duration
        except Exception as e:
            self.fail(f"API Request failed: {e}")

    def test_safe_url(self):
        print("\nTesting Safe URL: google.com")
        data, ms = self.check_url("https://google.com")
        print(f"Response: {data['action']} ({ms:.2f}ms)")
        self.assertIn(data['action'], ['allow', 'safe'])
        self.assertLess(data['risk_score'], 50)

    def test_phishing_url(self):
        print("\nTesting Phishing URL: netflix-verify-account.com")
        # Creating a fake URL that triggers heuristics (long, keywords)
        fake_url = "http://netflix-verify-account-security-update-12345.com/login"
        data, ms = self.check_url(fake_url)
        print(f"Response: {data['action']} ({ms:.2f}ms)")
        # Expect warn or block
        self.assertIn(data['action'], ['warn', 'block'])
        self.assertIn("Uses sensitive keywords", data['reasons'])

    def test_ignored_params(self):
        # Edge case: No URL
        res = requests.get(API_URL)
        self.assertEqual(res.status_code, 400)

if __name__ == '__main__':
    print("🛡️ Running Bulwark Backend Tests...")
    unittest.main()
