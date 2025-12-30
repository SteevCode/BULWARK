// time-restrictions.js - Dedicated Time Restrictions Module
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
        trackingSessions: {} // Persist active sessions
      };
      
      const data = await chrome.storage.local.get(defaults);
      this.currentSettings = data;
      
      // Restore tracking sessions from storage
      if (data.trackingSessions) {
        Object.entries(data.trackingSessions).forEach(([tabId, session]) => {
          this.timeTrackers.set(parseInt(tabId), session);
        });
      }
      
      // Reset daily counters if it's a new day
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
      
      // Tab events with proper error handling
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

      // Tab removal cleanup
      chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        this.cleanupTab(tabId);
      });

      // Message handlers for time-related actions
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action && request.action.startsWith("time_")) {
          this.handleTimeMessage(request, sender, sendResponse);
          return true; // Keep message channel open for async
        }
      });

    } catch (error) {
      console.error('Error setting up time restriction listeners:', error);
    }
  }

  async handleTimeMessage(request, sender, sendResponse) {
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
        case "time_getActiveSessions":
          result = {
            success: true,
            data: Array.from(this.timeTrackers.entries())
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
      
      // Update or create tracker for this tab
      this.timeTrackers.set(tabId, {
        hostname,
        startTime: now,
        lastUpdate: now
      });

      // Persist the session
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
      // Restore active tabs on startup
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
    // Clear existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateTimeUsage();
    }, 60000); // Update every minute
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
      
      // Calculate time spent on each active tab
      for (const [tabId, tracker] of this.timeTrackers.entries()) {
        try {
          // Verify tab still exists and is active
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
            
            // Reset start time for the counted period
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
      
      // Update persisted sessions
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
      
      // Update global usage
      if (this.currentSettings.globalDailyLimit) {
        this.currentSettings.globalUsed += globalTime;
        needsSave = true;
      }
      
      // Update site-specific usage
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
      // Check global limit
      if (this.currentSettings.globalDailyLimit && 
          this.currentSettings.globalUsed >= this.currentSettings.globalDailyLimit) {
        await this.showWarning("global");
        return;
      }
      
      // Check site-specific limits
      for (const site of this.currentSettings.siteLimits) {
        if (site.enabled && site.used >= site.limit) {
          await this.showWarning("site", site.site);
          break; // Only show one warning at a time
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
      
      // Show notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Bulwark Time Limit',
        message: message,
        priority: 2
      });
      
      // Block further browsing if global limit reached
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
      // Normalize domain
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
        // Update existing site limit
        this.currentSettings.siteLimits[existingIndex] = {
          site: normalizedSite,
          limit: parseInt(limit),
          used: this.currentSettings.siteLimits[existingIndex].used,
          enabled: true
        };
      } else {
        // Add new site limit
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

  // Public methods
  getSiteLimitCount() {
    return this.currentSettings.siteLimits.length;
  }

  getSiteLimits() {
    return this.currentSettings.siteLimits.map(site => ({
      site: site.site,
      limit: site.limit,
      used: site.used,
      enabled: site.enabled
    }));
  }

  getGlobalLimit() {
    return {
      used: this.currentSettings.globalUsed,
      limit: this.currentSettings.globalDailyLimit
    };
  }

  // Cleanup on extension unload
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.timeTrackers.clear();
  }
}

// Initialize Time Restrictions
const timeRestrictions = new TimeRestrictions();