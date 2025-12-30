chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let url = tabs[0].url;
    document.getElementById('result').innerText = "Checking " + url;
    fetch("http://127.0.0.1:8000/api/predict-risk/?url=" + encodeURIComponent(url))
      .then(r => r.json())
      .then(data => {
        document.getElementById('result').innerText =
          `URL: ${data.url}\nRisk: ${data.risk}\nScore: ${data.risk_score}`;
      })
      .catch(e => {
        document.getElementById('result').innerText = "Error contacting local API: " + e;
      });
  });
  