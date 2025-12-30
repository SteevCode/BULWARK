# 🛡️ Site Guard AI (Bulwark)
> **Advanced Hybrid Phishing & Privacy Protection System**  
> *Version 3.5 | Status: Production Ready*

---

## 📑 Table of Contents
1.  [🚀 Quick Start Guide](#-quick-start-guide)
2.  [🏗️ System Architecture & Connection](#-system-architecture--connection)
3.  [🔄 Detailed Workflow](#-detailed-workflow)
4.  [🧠 Capabilities & Functions](#-capabilities--functions)
    *   [Phishing Detection (AI-Powered)](#1-phishing-detection-ai-powered)
    *   [DiamondWall Ad Blocker](#2-diamondwall-ad-blocker)
    *   [Privacy Lens](#3-privacy-lens)
5.  [💾 Data Storage & Schema](#-data-storage--schema)
6.  [🛠️ Developer Manual](#-developer-manual)

---

## 🚀 Quick Start Guide

### Prerequisites
*   **OS**: Windows 10/11
*   **Browser**: Google Chrome / Brave / Edge
*   **Runtime**: Python 3.10+ (Ensure Python is added to PATH)

### Installation & Running
1.  **Install Dependencies** (First time only):
    Open a terminal in this folder and run:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Start the System**:
    Double-click the **`Run_SiteGuard.bat`** file in the root directory.
    *   ✅ **Activates** Python environment.
    *   ✅ **Starts** local AI Server on `http://127.0.0.1:8000`.
    *   ✅ **Opens** Chrome to the extensions page.

3.  **Load the Extension**:
    *   In Chrome, go to `chrome://extensions/`.
    *   Enable **Developer Mode** (top right).
    *   Click **Load Unpacked**.
    *   Select the `BULWARK` folder inside this project.

> **IMPORTANT**: Keep the black console window open! This is the AI Brain. If you close it, phishing detection will stop working (but Ad Blocking will still work).

---

## 🏗️ System Architecture & Connection

This project uses a **Hybrid Client-Server Architecture**:

1.  **Frontend (Chrome Extension - `BULWARK/`)**:
    *   Interacts with the user.
    *   Captures URLs and page content.
    *   Blocks ads locally using static rules.
    *   **Communicates** with the backend via HTTP REST API.

2.  **Backend (Local AI Server - `ai_cyber_ext_pro/`)**:
    *   Powered by **Django** + **Scikit-Learn** + **Transformers**.
    *   Hosts the Machine Learning models.
    *   Performs heavy Privacy Policy analysis using NLP.

### 🔗 Connection Details
The Extension talks to the Backend via standard HTTP requests:

| Feature | Endpoint | Method | Payload | Function |
| :--- | :--- | :--- | :--- | :--- |
| **Phishing** | `http://127.0.0.1:8000/api/predict-risk/` | `GET` | `?url=...` | Returns Risk Score (0-100) & Action |
| **Privacy** | `http://127.0.0.1:8000/api/analyze-privacy/` | `POST` | `{"text": "..."}` | Returns Summary & Risk Keywords |

---

## 🔄 Detailed Workflow

### 1. Phishing Detection Flow
1.  **User Navigates**: User visits `http://example.com`.
2.  **Whitelist Check**: Extension (`background.js`) checks `SITE_EXCLUSIONS`.
    *   *If Safe (e.g., Google, OpenAI)*: **ALLOW** immediately.
3.  **AI Analysis**: Extension sends URL to API (`/api/predict-risk/`).
4.  **Backend Logic**:
    *   Extracts features (URL length, domain entropy, suspicious keywords).
    *   Runs Random Forest Model.
    *   Returns `Action: Block` if Score > 70%.
5.  **Enforcement**: Extension sees `Block` action -> Redirects tab to `blocked_phishing.html`.
6.  **Logging**: Event is logged to `phishingHistory` in storage.

### 2. Ad Blocking Flow
1.  **Request Initiation**: Browser prepares to load resources (images, scripts).
2.  **DNR Engine**: `chrome.declarativeNetRequest` intercepts request.
3.  **Rule Matching**: Checks against 5000+ static rules (Ads, Trackers, Analytics).
4.  **Action**:
    *   **Block**: Request is cancelled.
    *   **Allow**: Whitelisted sites pass through.
5.  **Counting**: blocked count increments in local stats.

---

## 🧠 Capabilities & Functions

### 1. Phishing Detection (AI-Powered)
*   **Class**: `BulwarkEngine` (in `background.js`)
*   **Function**: `checkPhishingRisk(url)`
*   **Logic**:
    *   **Score 0-40**: Safe.
    *   **Score 41-70**: **Suspicious**. Shows warning badge.
    *   **Score 71-100**: **Phishing**. Full page block.
*   **Database**: Stores history of blocked sites for the Dashboard.

### 2. DiamondWall Ad Blocker
*   **Class**: `DiamondWallAdBlocker` (in `adblocker-tracker.js`)
*   **Features**:
    *   **Recursive Wildcard Support**: Fixes manifest V3 limitations.
    *   **Categorized Blocking**: Ads, Analytics, Social, OEM.
    *   **Smart Whitelisting**: Ensures Google Docs/Drive always work.

### 3. Privacy Lens
*   **Backend**: `privacy_app/views.py`
*   **AI Model**: `facebook/bart-large-cnn` (Hugging Face) for summarization.
*   **Logic**: extracting keywords like "sell data", "third party", "cookies" to calculate a privacy score.

---

## 💾 Data Storage & Schema

The extension uses `chrome.storage.local` to persist user data. Here is the data structure:

```json
{
  "killSwitch": true,          // Global Enable/Disable
  "blockedSitesEnabled": true, // Manual Site Blocker Toggle
  
  "stats": {                   // Core Statistics
    "adsBlocked": 1240,
    "phishingBlocked": 15,     // *NEW*
    "sitesBlocked": 45,
    "privacyScans": 8
  },
  
  "phishingHistory": [         // *NEW* List of blocked threats
    {
      "url": "http://evil-site.com",
      "risk": 85,
      "label": "phishing",
      "timestamp": 1708923445
    },
    ...
  ],
  
  "blockedSites": [            // Manually Blocked Sites
    { "url": "facebook.com", "enabled": true }
  ],
  
  "userWhitelist": [           // User AdBlock Exceptions
    "youtube.com",
    "github.com"
  ]
}
```

---

## 🛠️ Developer Manual

### Application Structure
*   `BULWARK/`: **Frontend**. Chrome Extension source code.
    *   `background/`: Service workers (Main engine).
    *   `dashboard/`: User interface Html/JS.
    *   `experiments/`: CSS/JS injections.
*   `ai_cyber_ext_pro/`: **Backend**. Django project.
    *   `privacy_app/`: API endpoints logic.
    *   `model/`: ML Model artifacts.

### Common Tasks
*   **Add AI Dependencies**: Update `requirements.txt` and run `pip install -r requirements.txt`.
*   **Modify Blocking Rules**: Edit `AD_RULES` in `BULWARK/background/adblocker-tracker.js`.
*   **Debug Background Script**: Open Extension -> Details -> Background Page (Inspect).

---
**© 2025 Site Guard Project**
