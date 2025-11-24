// Content script to find privacy policy links
// Enhanced content script with better policy detection
class EnhancedPrivacyPolicyFinder {
    constructor() {
        this.policyPatterns = [
            'privacy', 'privacy policy', 'privacy notice', 'data policy',
            'data protection', 'terms and conditions', 'terms of service',
            'terms of use', 'legal', 'cookie policy', 'data privacy',
            'gdpr', 'ccpa', 'privacy statement', 'data collection'
        ];
        
        this.excludedPatterns = [
            'login', 'signin', 'register', 'signup', 'contact',
            'about', 'help', 'support', 'account', 'settings'
        ];

        this.commonSelectors = [
            'footer a', '.footer a', '#footer a',
            '.legal-links a', '.privacy-links a',
            '[class*="privacy"] a', '[class*="policy"] a',
            '[href*="privacy"]', '[href*="policy"]'
        ];
    }

    findPrivacyPolicyLink() {
        try {
            const strategies = [
                () => this.findByLinkText(),
                () => this.findByHref(),
                () => this.findByCommonSelectors(),
                () => this.findInFooter(),
                () => this.findByMetaTags()
            ];

            for (const strategy of strategies) {
                const result = strategy();
                if (result) {
                    console.log(`Found policy using ${strategy.name}:`, result);
                    return result;
                }
            }

            return this.tryCommonUrls();

        } catch (error) {
            console.error('Error finding privacy policy:', error);
            return null;
        }
    }

    findByLinkText() {
        const links = Array.from(document.getElementsByTagName('a'));
        
        for (const link of links) {
            const text = (link.textContent || '').toLowerCase().trim();
            const href = link.href;
            
            if (this.isHighConfidencePolicyLink(text, href)) {
                return this.normalizeUrl(href);
            }
        }
        return null;
    }

    isHighConfidencePolicyLink(text, href) {
        if (!text || !href) return false;

        // Skip excluded patterns
        if (this.excludedPatterns.some(pattern => 
            text.includes(pattern) || href.includes(pattern))) {
            return false;
        }

        const highConfidenceTerms = [
            'privacy policy', 'privacy notice', 'data policy'
        ];

        return highConfidenceTerms.some(term => 
            text.includes(term) || href.includes(term)
        );
    }

    findByHref() {
        const links = Array.from(document.links);
        
        for (const link of links) {
            const href = link.href.toLowerCase();
            
            if (this.policyPatterns.some(pattern => 
                href.includes(pattern) && !this.excludedPatterns.some(excluded => href.includes(excluded)))) {
                return this.normalizeUrl(link.href);
            }
        }
        return null;
    }

    findByCommonSelectors() {
        for (const selector of this.commonSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = (element.textContent || '').toLowerCase();
                    const href = element.href;
                    
                    if (this.policyPatterns.some(pattern => text.includes(pattern)) &&
                        !this.excludedPatterns.some(excluded => text.includes(excluded))) {
                        return this.normalizeUrl(href);
                    }
                }
            } catch (error) {
                console.warn(`Selector ${selector} failed:`, error);
            }
        }
        return null;
    }

    findInFooter() {
        const footer = document.querySelector('footer, .footer, #footer');
        if (footer) {
            const links = footer.getElementsByTagName('a');
            for (const link of links) {
                const text = (link.textContent || '').toLowerCase();
                if (this.policyPatterns.some(pattern => text.includes(pattern))) {
                    return this.normalizeUrl(link.href);
                }
            }
        }
        return null;
    }

    findByMetaTags() {
        const metaTags = document.querySelectorAll('meta[name*="privacy"], meta[name*="policy"]');
        for (const meta of metaTags) {
            const content = meta.getAttribute('content');
            if (content && this.isValidUrl(content)) {
                return this.normalizeUrl(content);
            }
        }
        return null;
    }

    tryCommonUrls() {
        const commonPaths = [
            '/privacy', '/privacy-policy', '/privacy.html',
            '/privacy.php', '/legal/privacy', '/privacy-notice'
        ];

        for (const path of commonPaths) {
            const testUrl = window.location.origin + path;
            if (this.urlLikelyExists(testUrl)) {
                return testUrl;
            }
        }
        return null;
    }

    urlLikelyExists(url) {
        // Check if there's a link to this URL
        return !!document.querySelector(`a[href="${url}"], a[href="${url}/"]`);
    }

    normalizeUrl(url) {
        try {
            if (!url) return null;
            
            // Handle relative URLs
            if (url.startsWith('/')) {
                return window.location.origin + url;
            }
            
            // Handle protocol-relative URLs
            if (url.startsWith('//')) {
                return window.location.protocol + url;
            }
            
            // Ensure it's a valid absolute URL
            const urlObj = new URL(url);
            return urlObj.href;
            
        } catch (error) {
            console.error('Error normalizing URL:', error, url);
            return null;
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
}

const enhancedFinder = new EnhancedPrivacyPolicyFinder();

// Update the message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "find_link" || request.action === "auto_find_privacy_policy") {
        try {
            const policyUrl = enhancedFinder.findPrivacyPolicyLink();
            
            sendResponse({
                found: !!policyUrl,
                url: policyUrl,
                domain: window.location.hostname,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error in enhanced content script:', error);
            sendResponse({
                found: false,
                error: error.message,
                domain: window.location.hostname
            });
        }
    }
    
    return true;
});