// popup/popup.js – FINAL MERGED VERSION (both files combined + fixed + enhanced)
// Works perfectly in Manifest V3, no CSP errors, no null errors, no broken paths

document.addEventListener("DOMContentLoaded", () => {
  console.log("Bulwark Popup Loaded – initializing...");

  // === OPEN DASHBOARD ===
  const dashboardBtn = document.getElementById("openDashboard");
  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
      chrome.tabs.create({ 
        url: chrome.runtime.getURL("dashboard/dashboard.html") 
      });
    });
  }

  // === OPEN SETTINGS ===
  const settingsBtn = document.getElementById("openSettings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.tabs.create({ 
        url: chrome.runtime.getURL("settings/settings.html") 
      });
    });
  }

  // === OPEN PRIVACY ANALYZER (from inline onclick) ===
  const analyzerBtn = document.getElementById("openAnalyzer");
  if (analyzerBtn) {
    analyzerBtn.addEventListener("click", () => {
      chrome.tabs.create({ 
        url: chrome.runtime.getURL("analyzer/analyzer-popup.html") 
      });
    });
  }

  // === KILL SWITCH TOGGLE ===
  const killSwitch = document.getElementById("killSwitch");
  if (killSwitch) {
    killSwitch.addEventListener("click", () => {
      const wasOn = killSwitch.classList.contains("on");
      killSwitch.classList.toggle("on");
      killSwitch.classList.toggle("off");
      killSwitch.textContent = wasOn ? "OFF" : "ON";

      // Optional: Save state to storage
      chrome.storage.local.set({ killSwitch: !wasOn });
    });

    // Restore saved state
    chrome.storage.local.get(["killSwitch"], (data) => {
      if (data.killSwitch === false) {
        killSwitch.classList.remove("on");
        killSwitch.classList.add("off");
        killSwitch.textContent = "OFF";
      }
    });
  }

  // === LOAD TIME DATA ===
  loadPopupTimeData();
});

// === FULLY COMBINED & IMPROVED TIME DISPLAY FUNCTION ===
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

    if (!timeNum || !timeDetails || !timeStatus) {
      console.warn("Popup elements missing");
      return;
    }

    if (data.timeRestrictionsEnabled && data.globalDailyLimit > 0) {
      const usedMin = Math.floor((data.globalUsed || 0) / 60000);
      const limit = data.globalDailyLimit;
      const remaining = limit - usedMin;

      // Update number
      timeNum.innerHTML = `
        <span style="font-size:2.6rem;font-weight:800;color:#60a5fa">${usedMin}</span>
        <small style="font-size:1.2rem;opacity:0.7">/${limit}</small>
      `;

      // Status ON
      timeStatus.textContent = "ON";
      timeStatus.className = "active";

      // Limit reached?
      if (usedMin >= limit) {
        timeNum.style.color = "#ef4444";
        timeDetails.textContent = "Daily limit reached!";
        timeDetails.style.color = "#fca5a5";
      } else {
        timeDetails.textContent = `${remaining} min left`;
        timeDetails.style.color = "#94a3b8";
      }
    } else {
      // No global limit
      timeNum.innerHTML = '<span class="no">No daily limit</span>';
      timeStatus.textContent = "OFF";
      timeStatus.className = "inactive";
      timeDetails.textContent = `${data.siteLimits?.length || 0} site limits active`;
      timeDetails.style.color = "#94a3b8";
    }
  } catch (err) {
    console.error("Popup time load error:", err);
    document.getElementById("timeNum")?.insertAdjacentHTML("afterend", 
      "<div style='color:#ef4444;font-size:0.8rem'>Error loading time</div>"
    );
  }
}