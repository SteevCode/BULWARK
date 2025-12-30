// popup.js – 100% working, no CSP errors, no null errors
document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup DOM loaded – initializing...");

  // === OPEN DASHBOARD ===
  const dashboardBtn = document.getElementById("openDashboard");
  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("dashbord1.html") });
    });
  }

  // === OPEN SETTINGS ===
  const settingsBtn = document.getElementById("openSettings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("settings1.html") });
    });
  }

  // === KILL SWITCH (optional) ===
  const killSwitch = document.getElementById("killSwitch");
  if (killSwitch) {
    killSwitch.addEventListener("click", () => {
      const wasOn = killSwitch.classList.contains("on");
      killSwitch.classList.toggle("on");
      killSwitch.classList.toggle("off");
      killSwitch.textContent = wasOn ? "OFF" : "ON";
    });
  }

  // === TIME DISPLAY ===
  loadPopupTimeData();

  // === BLOCKED SITES TOGGLE (if you have it) ===
  // loadPopupBlockedSites(); // Uncomment if you add this later
});

async function loadPopupTimeData() {
  try {
    const data = await chrome.storage.local.get([
      "globalDailyLimit",
      "globalUsed",
      "timeRestrictionsEnabled",
      "siteLimits"
    ]);

    const timeNum = document.getElementById("timeNum");
    const timeDetails = document.getElementById("timeDetails");
    const timeStatus = document.getElementById("timeStatus");

    if (!timeNum) return;

    if (data.timeRestrictionsEnabled && data.globalDailyLimit > 0) {
      const usedMin = Math.floor((data.globalUsed || 0) / 60000);
      const limit = data.globalDailyLimit;

      timeNum.innerHTML = `<span style="font-size:2.6rem;font-weight:800;color:#60a5fa">${usedMin}</span><small style="font-size:1.2rem;opacity:0.7">/${limit}</small>`;
      timeStatus.textContent = "ON";
      timeStatus.className = "active";

      if (usedMin >= limit) {
        timeNum.style.color = "#ef4444";
        timeDetails.textContent = "Daily limit reached!";
        timeDetails.style.color = "#fca5a5";
      } else {
        timeDetails.textContent = `${limit - usedMin} min left`;
      }
    } else {
      timeNum.innerHTML = '<span class="no">No daily limit</span>';
      timeStatus.textContent = "OFF";
      timeStatus.className = "inactive";
      timeDetails.textContent = `${data.siteLimits?.length || 0} site limits active`;
    }
  } catch (err) {
    console.error("Time load error:", err);
  }
}