// background.js - Complete Bulwark Extension Background Script
// === REAL-TIME AD BLOCKER STATS TRACKER ===
class AdBlockerStats {
  constructor() {
    this.stats = { adsBlocked: 0, trackersBlocked: 0 };
    this.init();
  }

  async init() {
    await this.loadStats();
    this.startListening();
  }

  async loadStats() {
    const data = await chrome.storage.local.get(['adBlockerStats']);
    if (data.adBlockerStats) {
      this.stats = data.adBlockerStats;
    }
  }

  async saveStats() {
    this.stats.adsBlocked = Number(this.stats.adsBlocked);
    this.stats.trackersBlocked = Number(this.stats.trackersBlocked);
    await chrome.storage.local.set({ adBlockerStats: this.stats });
  }

  increment(type = 'adsBlocked') {
    if (type === 'adsBlocked') this.stats.adsBlocked++;
    else if (type === 'trackersBlocked') this.stats.trackersBlocked++;
    
    this.saveStats();
  }

  getStats() {
    return { ...this.stats };
  }

  startListening() {
    if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
      chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
        const url = info.request.url.toLowerCase();

        if (
          url.includes('ads') || 
          url.includes('doubleclick') || 
          url.includes('googlesyndication') || 
          url.includes('adnxs') ||
          url.includes('googlead')
        ) {
          this.increment('adsBlocked');
        } else {
          this.increment('trackersBlocked');
        }
      });
    }
  }
}

// Initialize stats tracker
const adBlockerStats = new AdBlockerStats();

// Optional: Expose stats via message (for dashboard/popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_adblocker_stats") {
    adBlockerStats.getStats().then(stats => {
      sendResponse({ success: true, data: stats });
    });
    return true; // Keep channel open
  }
});
class TimeRestrictions {
  constructor() {
    this.currentSettings = {};
    this.timeTrackers = new Map();
    this.isUpdating = false;
    this.updateInterval = null;
    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      this.setupEventListeners();
      this.startTimeTracking();
      this.startUpdateInterval();
      console.log('Time Restrictions module ready');
    } catch (error) {
      console.error('Time Restrictions init error:', error);
    }
  }

  async loadSettings() {
    try {
      const defaults = {
        timeRestrictionsEnabled: false,
        globalDailyLimit: null,
        globalUsed: 0,
        warningMessage: "Your daily browsing time is over! Take a break.",
        siteLimits: [],
        lastResetDate: new Date().toDateString(),
        trackingSessions: {}
      };
      
      const data = await chrome.storage.local.get(defaults);
      this.currentSettings = data;
      
      // Restore tracking sessions from storage
      if (data.trackingSessions) {
        Object.entries(data.trackingSessions).forEach(([tabId, session]) => {
          this.timeTrackers.set(parseInt(tabId), session);
        });
      }
      
      await this.resetDailyCountersIfNeeded();
    } catch (error) {
      console.error('Error loading time settings:', error);
      this.currentSettings = defaults;
    }
  }

  async resetDailyCountersIfNeeded() {
    try {
      const today = new Date().toDateString();
      if (this.currentSettings.lastResetDate !== today) {
        console.log('Resetting daily counters for new day');
        
        this.currentSettings.globalUsed = 0;
        this.currentSettings.siteLimits = this.currentSettings.siteLimits.map(site => ({
          ...site,
          used: 0
        }));
        this.currentSettings.lastResetDate = today;
        
        await this.saveSettings();
      }
    } catch (error) {
      console.error('Error resetting daily counters:', error);
    }
  }

  setupEventListeners() {
    try {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
          this.handleSettingsChange(changes);
        }
      });
      
      chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
        if (info.status === 'complete' && tab.url && this.isTrackableUrl(tab.url)) {
          this.handleTabUpdate(tabId, tab);
        }
      });

      chrome.tabs.onActivated.addListener(activeInfo => {
        chrome.tabs.get(activeInfo.tabId, tab => {
          if (tab.url && this.isTrackableUrl(tab.url)) {
            this.handleTabUpdate(activeInfo.tabId, tab);
          }
        });
      });

      chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        this.cleanupTab(tabId);
      });

    } catch (error) {
      console.error('Error setting up time restriction listeners:', error);
    }
  }

  isTrackableUrl(url) {
    try {
      return url && 
        !url.startsWith('chrome://') && 
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('about:') &&
        (url.startsWith('http://') || url.startsWith('https://'));
    } catch {
      return false;
    }
  }

  handleTabUpdate(tabId, tab) {
    try {
      if (!tab.url || !this.isTrackableUrl(tab.url)) {
        this.cleanupTab(tabId);
        return;
      }

      const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
      const now = Date.now();
      
      this.timeTrackers.set(tabId, {
        hostname,
        startTime: now,
        lastUpdate: now
      });

      this.persistSessions();

    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }

  cleanupTab(tabId) {
    try {
      if (this.timeTrackers.has(tabId)) {
        this.timeTrackers.delete(tabId);
        this.persistSessions();
      }
    } catch (error) {
      console.error('Error cleaning up tab:', error);
    }
  }

  async persistSessions() {
    try {
      const sessions = {};
      this.timeTrackers.forEach((session, tabId) => {
        sessions[tabId] = session;
      });
      
      await chrome.storage.local.set({ trackingSessions: sessions });
    } catch (error) {
      console.error('Error persisting sessions:', error);
    }
  }

  startTimeTracking() {
    try {
      chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
          if (tab.url && this.isTrackableUrl(tab.url)) {
            this.handleTabUpdate(tab.id, tab);
          }
        });
      });
    } catch (error) {
      console.error('Error starting time tracking:', error);
    }
  }

  startUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateTimeUsage();
    }, 60000);
  }

  async updateTimeUsage() {
    if (this.isUpdating || !this.currentSettings.timeRestrictionsEnabled) {
      return;
    }

    this.isUpdating = true;
    
    try {
      const now = Date.now();
      let globalTimeAdded = 0;
      const siteTimeUpdates = {};
      
      for (const [tabId, tracker] of this.timeTrackers.entries()) {
        try {
          const tab = await chrome.tabs.get(tabId).catch(() => null);
          if (!tab || !tab.url || !this.isTrackableUrl(tab.url)) {
            this.cleanupTab(tabId);
            continue;
          }

          const timeSpentSeconds = (now - tracker.startTime) / 1000;
          const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);
          
          if (timeSpentMinutes > 0) {
            globalTimeAdded += timeSpentMinutes;
            
            const hostname = tracker.hostname;
            if (!siteTimeUpdates[hostname]) {
              siteTimeUpdates[hostname] = 0;
            }
            siteTimeUpdates[hostname] += timeSpentMinutes;
            
            tracker.startTime = now - ((timeSpentSeconds % 60) * 1000);
            tracker.lastUpdate = now;
          }
        } catch (trackerError) {
          console.error('Error processing tracker for tab', tabId, trackerError);
          this.cleanupTab(tabId);
        }
      }
      
      if (globalTimeAdded > 0) {
        await this.applyTimeUpdates(globalTimeAdded, siteTimeUpdates);
      }
      
      await this.persistSessions();
      
    } catch (error) {
      console.error('Error updating time usage:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  async applyTimeUpdates(globalTime, siteTimes) {
    try {
      let needsSave = false;
      
      if (this.currentSettings.globalDailyLimit) {
        this.currentSettings.globalUsed += globalTime;
        needsSave = true;
      }
      
      this.currentSettings.siteLimits = this.currentSettings.siteLimits.map(site => {
        const siteTime = siteTimes[site.site];
        if (siteTime && site.enabled) {
          const newUsed = Math.min(site.used + siteTime, site.limit);
          if (newUsed !== site.used) {
            needsSave = true;
            return { ...site, used: newUsed };
          }
        }
        return site;
      });
      
      if (needsSave) {
        await this.saveSettings();
        await this.checkLimits();
      }
    } catch (error) {
      console.error('Error applying time updates:', error);
    }
  }

  async checkLimits() {
    try {
      if (this.currentSettings.globalDailyLimit && 
          this.currentSettings.globalUsed >= this.currentSettings.globalDailyLimit) {
        await this.showWarning("global");
        return;
      }
      
      for (const site of this.currentSettings.siteLimits) {
        if (site.enabled && site.used >= site.limit) {
          await this.showWarning("site", site.site);
          break;
        }
      }
    } catch (error) {
      console.error('Error checking limits:', error);
    }
  }

  async showWarning(type, site = null) {
    try {
      let message = this.currentSettings.warningMessage;
      
      if (type === "site") {
        message = `Time limit reached for ${site}. ${message}`;
      }
      
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Bulwark Time Limit',
        message: message,
        priority: 2
      });
      
      if (type === "global") {
        chrome.tabs.query({}, tabs => {
          tabs.forEach(tab => {
            try {
              if (tab.url && this.isTrackableUrl(tab.url)) {
                chrome.tabs.update(tab.id, { 
                  url: chrome.runtime.getURL('blocked.html?reason=time_limit') 
                });
              }
            } catch (tabError) {
              console.error('Error blocking tab:', tabError);
            }
          });
        });
      }
    } catch (error) {
      console.error('Error showing warning:', error);
    }
  }

  async addSiteLimit(site, limit) {
    try {
      const normalizedSite = this.normalizeDomain(site);
      
      if (!normalizedSite) {
        throw new Error("Invalid domain format. Please use format like 'example.com'");
      }
      
      if (!limit || isNaN(limit) || parseInt(limit) <= 0) {
        throw new Error("Please enter a valid time limit (positive number)");
      }
      
      const existingIndex = this.currentSettings.siteLimits.findIndex(
        s => this.normalizeDomain(s.site) === normalizedSite
      );
      
      if (existingIndex !== -1) {
        this.currentSettings.siteLimits[existingIndex] = {
          site: normalizedSite,
          limit: parseInt(limit),
          used: this.currentSettings.siteLimits[existingIndex].used,
          enabled: true
        };
      } else {
        this.currentSettings.siteLimits.push({
          site: normalizedSite,
          limit: parseInt(limit),
          used: 0,
          enabled: true
        });
      }
      
      await this.saveSettings();
      return { success: true };
    } catch (error) {
      console.error('Error adding site limit:', error);
      return { success: false, error: error.message };
    }
  }

  normalizeDomain(domain) {
    try {
      return domain.toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .split(':')[0];
    } catch {
      return null;
    }
  }

  async removeSiteLimit(site) {
    try {
      const normalizedSite = this.normalizeDomain(site);
      const initialLength = this.currentSettings.siteLimits.length;
      
      this.currentSettings.siteLimits = this.currentSettings.siteLimits.filter(
        s => this.normalizeDomain(s.site) !== normalizedSite
      );
      
      if (this.currentSettings.siteLimits.length === initialLength) {
        throw new Error("Site limit not found");
      }
      
      await this.saveSettings();
      return { success: true };
    } catch (error) {
      console.error('Error removing site limit:', error);
      return { success: false, error: error.message };
    }
  }

  async toggleSiteLimit(site, enabled) {
    try {
      const normalizedSite = this.normalizeDomain(site);
      const siteLimit = this.currentSettings.siteLimits.find(
        s => this.normalizeDomain(s.site) === normalizedSite
      );
      
      if (siteLimit) {
        siteLimit.enabled = enabled;
        await this.saveSettings();
        return { success: true };
      } else {
        throw new Error("Site limit not found");
      }
    } catch (error) {
      console.error('Error toggling site limit:', error);
      return { success: false, error: error.message };
    }
  }

  async updateGlobalLimit(limit, message) {
    try {
      this.currentSettings.globalDailyLimit = limit ? parseInt(limit) : null;
      if (message && message.trim()) {
        this.currentSettings.warningMessage = message.trim();
      }
      this.currentSettings.timeRestrictionsEnabled = !!limit;
      await this.saveSettings();
      return { success: true };
    } catch (error) {
      console.error('Error updating global limit:', error);
      return { success: false, error: error.message };
    }
  }

  async saveSettings() {
    try {
      const settingsToSave = {
        timeRestrictionsEnabled: this.currentSettings.timeRestrictionsEnabled,
        globalDailyLimit: this.currentSettings.globalDailyLimit,
        globalUsed: this.currentSettings.globalUsed,
        warningMessage: this.currentSettings.warningMessage,
        siteLimits: this.currentSettings.siteLimits,
        lastResetDate: this.currentSettings.lastResetDate
      };
      
      await chrome.storage.local.set(settingsToSave);
      return { success: true };
    } catch (error) {
      console.error('Error saving time settings:', error);
      throw error;
    }
  }

  handleSettingsChange(changes) {
    try {
      for (const key in changes) {
        if (key in this.currentSettings) {
          this.currentSettings[key] = changes[key].newValue;
        }
      }
    } catch (error) {
      console.error('Error handling settings change:', error);
    }
  }

  // Public API for other components
  async handleTimeMessage(request, sendResponse) {
    try {
      let result;
      
      switch (request.action) {
        case "time_addSiteLimit":
          result = await this.addSiteLimit(request.site, request.limit);
          break;
        case "time_removeSiteLimit":
          result = await this.removeSiteLimit(request.site);
          break;
        case "time_toggleSiteLimit":
          result = await this.toggleSiteLimit(request.site, request.enabled);
          break;
        case "time_updateGlobalLimit":
          result = await this.updateGlobalLimit(request.limit, request.message);
          break;
        case "time_getStats":
          result = { 
            success: true, 
            data: {
              globalUsed: this.currentSettings.globalUsed,
              globalLimit: this.currentSettings.globalDailyLimit,
              siteLimits: this.currentSettings.siteLimits,
              enabled: this.currentSettings.timeRestrictionsEnabled,
              warningMessage: this.currentSettings.warningMessage
            }
          };
          break;
        default:
          result = { success: false, error: "Unknown time action: " + request.action };
      }
      
      sendResponse(result);
    } catch (error) {
      console.error('Time restriction message error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Privacy Analysis Functions
// FIXED: Privacy Analysis Functions with proper storage integration
async function analyzePrivacyPolicy(url, domain, sendResponse) {
    try {
        console.log(`🔍 Analyzing privacy policy for: ${domain} at ${url}`);
        
        if (!url || !isValidUrl(url)) {
            throw new Error("Invalid privacy policy URL");
        }

        // Create analyzer instance
        const analyzer = new PrivacyAnalyzer();
        await analyzer.init();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        // Fetch privacy policy
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        const text = cleanHtml(html);

        if (text.length < 200) {
            throw new Error("Not enough text content found for analysis");
        }

        // Perform analysis
        const analysisResult = await analyzer.analyzePrivacyPolicy(text, domain);
        
        if (analysisResult.success) {
            sendResponse({
                success: true,
                data: analysisResult
            });
        } else {
            throw new Error(analysisResult.error || "Analysis failed");
        }

    } catch (error) {
        console.error('Privacy analysis error:', error);
        
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = "Request timed out. The privacy policy page might be slow or unavailable.";
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = "Network error. Check your internet connection and try again.";
        }

        sendResponse({
            success: false,
            error: errorMessage
        });
    }
}

// FIXED: Get privacy stats with proper storage access
function getPrivacyStats(sendResponse) {
    chrome.storage.local.get(['privacyAnalyzerData'], (result) => {
        const data = result.privacyAnalyzerData || {
            dailyAnalyzed: 0,
            storedSites: [],
            overallPrivacyScore: 0
        };
        
        // Calculate overall score from stored sites
        const overallScore = data.storedSites.length > 0 
            ? Math.round(data.storedSites.reduce((sum, site) => sum + site.overallScore, 0) / data.storedSites.length)
            : 0;
        
        sendResponse({
            success: true,
            data: {
                dailyAnalyzed: data.dailyAnalyzed || 0,
                storedSites: data.storedSites || [],
                overallPrivacyScore: overallScore
            }
        });
    });
}
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanHtml(html) {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[#\w]+;/g, " ");

  return text.replace(/\s+/g, " ").trim();
}

async function storeAnalysisResult(domain, data) {
  try {
    const key = `privacy_analysis_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await chrome.storage.local.set({
      [key]: {
        ...data,
        analyzedAt: Date.now(),
        domain: domain
      }
    });
  } catch (error) {
    console.error('Error storing analysis result:', error);
  }
}

function getPrivacyStats() {
  // Simulate privacy stats (replace with actual data from storage)
  return {
    overallPrivacyScore: 75,
    dailyAnalyzed: 5,
    storedSites: [
      { domain: 'example.com', overallScore: 80 },
      { domain: 'test.com', overallScore: 65 }
    ]
  };
}

// Main Bulwark Engine
class BulwarkEngine {
  constructor() {
    this.currentSettings = {};
    this.blockedUrls = new Set();
    this.timeRestrictions = new TimeRestrictions();
    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      this.setupEventListeners();
      console.log('Bulwark Engine ready');
    } catch (error) {
      console.error('Bulwark Engine init error:', error);
    }
  }

  async loadSettings() {
    try {
      const defaults = {
        killSwitch: true,
        blockedSites: [],
        blockedSitesEnabled: true,
        stats: { adsBlocked: 0, privacyScans: 0, sitesBlocked: 0 }
      };
      const data = await chrome.storage.local.get(defaults);
      this.currentSettings = data;
      this.updateBlockedUrls();
    } catch (error) {
      console.error('Error loading settings:', error);
      this.currentSettings = defaults;
    }
  }

  updateBlockedUrls() {
    try {
      this.blockedUrls.clear();
      if (this.currentSettings.blockedSitesEnabled) {
        this.currentSettings.blockedSites.forEach(s => this.blockedUrls.add(s.toLowerCase()));
      }
    } catch (error) {
      console.error('Error updating blocked URLs:', error);
    }
  }

  setupEventListeners() {
    try {
      chrome.storage.onChanged.addListener(changes => this.handleSettingsChange(changes));

      chrome.webNavigation.onBeforeNavigate.addListener(details => {
        if (details.frameId === 0) this.checkAndBlockUrl(details.url, details.tabId);
      });

      // Unified message listener
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Route time-related messages to TimeRestrictions
        if (request.action && request.action.startsWith("time_")) {
          this.timeRestrictions.handleTimeMessage(request, sendResponse);
          return true;
        }
        
        // Handle other messages
        this.handleGeneralMessage(request, sender, sendResponse);
        return true;
      });

    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }

  checkAndBlockUrl(url, tabId) {
    try {
      if (!this.currentSettings.killSwitch) return;

      const hostname = new URL(url).hostname.toLowerCase();
      if (this.blockedUrls.has(hostname)) {
        chrome.tabs.update(tabId, { 
          url: chrome.runtime.getURL('blocked.html?reason=site_blocker&url=' + encodeURIComponent(url)) 
        });
      }
    } catch (error) {
      console.error('Error checking and blocking URL:', error);
    }
  }

  async handleGeneralMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case "killSwitchToggled":
          await chrome.storage.local.set({ killSwitch: request.enabled });
          sendResponse({ success: true });
          break;
        case "getStats":
          sendResponse({ success: true, data: this.currentSettings.stats });
          break;
        case "addBlockedSite":
          await this.addBlockedSite(request.site);
          sendResponse({ success: true });
          break;
        case "removeBlockedSite":
          await this.removeBlockedSite(request.site);
          sendResponse({ success: true });
          break;
        case "analyze_privacy_policy":
          await analyzePrivacyPolicy(request.url, request.domain, sendResponse);
          break;
        case "get_privacy_stats":
          sendResponse({
            success: true,
            data: getPrivacyStats()
          });
          break;
        case "get_adblocker_stats":
            sendResponse({ 
            success: true, 
          data: adBlockerTracker.getStats() 
          });
          break;
        default:
          sendResponse({ success: false, error: "unknown action" });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async addBlockedSite(site) {
    try {
      const normalizedSite = site.toLowerCase().trim().replace(/^https?:\/\//, '').split('/')[0];
      if (!normalizedSite.includes('.')) throw new Error("Invalid domain");
      
      const list = [...(this.currentSettings.blockedSites || [])];
      if (list.includes(normalizedSite)) throw new Error("Already blocked");
      
      list.push(normalizedSite);
      await chrome.storage.local.set({ blockedSites: list });
      this.currentSettings.blockedSites = list;
      this.updateBlockedUrls();
    } catch (error) {
      console.error('Error adding blocked site:', error);
      throw error;
    }
  }

  async removeBlockedSite(site) {
    try {
      const list = (this.currentSettings.blockedSites || []).filter(s => s !== site);
      await chrome.storage.local.set({ blockedSites: list });
      this.currentSettings.blockedSites = list;
      this.updateBlockedUrls();
    } catch (error) {
      console.error('Error removing blocked site:', error);
      throw error;
    }
  }

  async updateStats(key, inc = 1) {
    try {
      const stats = { ...this.currentSettings.stats };
      stats[key] = (stats[key] || 0) + inc;
      await chrome.storage.local.set({ stats });
      this.currentSettings.stats = stats;
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  handleSettingsChange(changes) {
    try {
      for (const key in changes) {
        this.currentSettings[key] = changes[key].newValue;
        if (key === 'blockedSites' || key === 'blockedSitesEnabled') {
          this.updateBlockedUrls();
        }
      }
    } catch (error) {
      console.error('Error handling settings change:', error);
    }
  }
}
// FIXED: Ad Blocker Tracker - CORRECT VERSION
class AdBlockerTracker {
  constructor() {
    this.stats = {
      adsBlocked: 0,
      trackersBlocked: 0,
      lastReset: Date.now()
    };
    this.init();
  }

  async init() {
    await this.loadStats();
    this.setupAdBlockListeners();
  }

  setupAdBlockListeners() {
    // Track when ads are blocked
    if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
      chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
        this.handleBlockedRequest(info);
      });
    }
  }

  handleBlockedRequest(info) {
    try {
      const { request } = info;
      
      // Simple counting - no complex logic that could fail
      if (request.url.includes('ads') || request.url.includes('doubleclick') || request.url.includes('googlead')) {
        this.stats.adsBlocked++;
      } else {
        this.stats.trackersBlocked++;
      }

      console.log(`🚫 Ad blocked: ${this.stats.adsBlocked} ads, ${this.stats.trackersBlocked} trackers`);
    } catch (error) {
      console.error('Error in handleBlockedRequest:', error);
    }
  }

  async loadStats() {
    try {
      const data = await chrome.storage.local.get(['adBlockerStats']);
      if (data.adBlockerStats) {
        this.stats = { ...this.stats, ...data.adBlockerStats };
      }
    } catch (error) {
      console.error('Error loading ad blocker stats:', error);
    }
  }

  async saveStats() {
    try {
      await chrome.storage.local.set({ adBlockerStats: this.stats });
    } catch (error) {
      console.error('Error saving ad blocker stats:', error);
    }
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats() {
    this.stats.adsBlocked = 0;
    this.stats.trackersBlocked = 0;
    this.stats.lastReset = Date.now();
    this.saveStats();
  }
}

// Initialize ad blocker tracker
const adBlockerTracker = new AdBlockerTracker();
// Initialize the extension
new BulwarkEngine();