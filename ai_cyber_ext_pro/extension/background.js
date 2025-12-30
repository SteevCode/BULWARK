chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    fetch("http://127.0.0.1:8000/api/predict-risk/?url=" + encodeURIComponent(tab.url))
      .then(res => res.json())
      .then(data => {
        console.log("Risk Result:", data);
        let text = data.risk === "High" ? "!" : "OK";
        chrome.action.setBadgeText({ text: text, tabId: tabId });
      })
      .catch(err => {
        console.error("API Error:", err);
        chrome.action.setBadgeText({ text: "?" , tabId: tabId});
      });
  }
});
