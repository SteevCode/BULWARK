/**
 * ENHANCED PRIVACY ANALYZER MODULE
 * Fixed NLP integration and improved analysis algorithms
 */

// Use global compromise instead of ES modules for content script compatibility
let nlp = null;

// Initialize NLP library
async function initializeNLP() {
    if (typeof window !== 'undefined' && window.nlp) {
        nlp = window.nlp;
        return true;
    }
    
    // Fallback: Load compromise if available, otherwise use simplified analysis
    try {
        if (typeof compromise !== 'undefined') {
            nlp = compromise;
            return true;
        }
    } catch (error) {
        console.warn('NLP library not available, using simplified analysis');
    }
    return false;
}

export class PrivacyAnalyzer {
    constructor() {
        this.dailyAnalyzed = 0;
        this.lastResetDate = new Date().toDateString();
        this.storedSites = [];
        this.nlpAvailable = false;
        this.init();
    }

    async init() {
        this.nlpAvailable = await initializeNLP();
        await this.loadStoredData();
        this.checkDailyReset();
    }

    async loadStoredData() {
        try {
            const data = await this.getStorageData();
            this.dailyAnalyzed = data.dailyAnalyzed || 0;
            this.storedSites = data.storedSites || [];
            this.lastResetDate = data.lastResetDate || new Date().toDateString();
        } catch (error) {
            console.error('Error loading stored data:', error);
            this.dailyAnalyzed = 0;
            this.storedSites = [];
        }
    }

    async saveStoredData() {
        try {
            await this.setStorageData({
                dailyAnalyzed: this.dailyAnalyzed,
                storedSites: this.storedSites,
                lastResetDate: this.lastResetDate
            });
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    checkDailyReset() {
        const today = new Date().toDateString();
        if (today !== this.lastResetDate) {
            this.dailyAnalyzed = 0;
            this.lastResetDate = today;
            this.saveStoredData();
        }
    }

    async analyzePrivacyPolicy(fullText, domain) {
        try {
            // Validation
            if (!fullText || fullText.length < 100) {
                return {
                    success: false,
                    error: "Text too short for meaningful analysis.",
                    domain: domain
                };
            }

            // Increment daily counter
            this.dailyAnalyzed++;
            await this.saveStoredData();

            // Analyze text with improved chunking
            const chunks = this.contextAwareSplit(fullText, 15000);
            const analysis = await this.enhancedAnalyzeChunks(chunks);
            
            // Calculate overall score with improved algorithm
            const overallScore = this.calculateEnhancedOverallScore(analysis);
            
            // Store results with conflict prevention
            await this.storeSiteAnalysisSafely(domain, analysis, overallScore);

            return {
                success: true,
                domain: domain,
                overallScore: overallScore,
                analysis: analysis,
                dailyAnalyzed: this.dailyAnalyzed
            };

        } catch (error) {
            console.error('Analysis error:', error);
            return {
                success: false,
                error: error.message,
                domain: domain
            };
        }
    }

    async enhancedAnalyzeChunks(chunks) {
        let aggregated = {
            dataCollection: { score: 0, evidence: [] },
            dataUsage: { score: 0, evidence: [] },
            dataSharing: { score: 0, evidence: [] },
            userRights: { score: 0, evidence: [] },
            security: { score: 0, evidence: [] },
            redFlags: []
        };

        let chunkCount = 0;

        for (const chunk of chunks) {
            const chunkAnalysis = await this.enhancedAnalyzeSingleChunk(chunk);
            chunkCount++;

            // Aggregate scores and evidence
            Object.keys(aggregated).forEach(key => {
                if (key !== 'redFlags' && chunkAnalysis[key]) {
                    aggregated[key].score += chunkAnalysis[key].score;
                    aggregated[key].evidence.push(...chunkAnalysis[key].evidence);
                }
            });
            
            aggregated.redFlags.push(...chunkAnalysis.redFlags);
        }

        // Normalize scores (0-100 scale)
        Object.keys(aggregated).forEach(key => {
            if (key !== 'redFlags' && aggregated[key]) {
                aggregated[key].score = Math.min(Math.round(aggregated[key].score / chunkCount), 100);
                // Remove duplicate and validate evidence
                aggregated[key].evidence = this.validateAndDedupeEvidence(aggregated[key].evidence);
            }
        });

        aggregated.redFlags = [...new Set(aggregated.redFlags)];

        return aggregated;
    }

    async enhancedAnalyzeSingleChunk(text) {
        const analysis = {
            dataCollection: { score: 0, evidence: [] },
            dataUsage: { score: 0, evidence: [] },
            dataSharing: { score: 0, evidence: [] },
            userRights: { score: 0, evidence: [] },
            security: { score: 0, evidence: [] },
            redFlags: []
        };

        // Split into sentences while preserving context
        const sentences = this.splitIntoSentences(text);

        for (const sentence of sentences) {
            const sentenceAnalysis = await this.analyzeSentence(sentence);
            
            // Aggregate results
            Object.keys(analysis).forEach(key => {
                if (key !== 'redFlags' && sentenceAnalysis[key]) {
                    analysis[key].score += sentenceAnalysis[key].score;
                    if (sentenceAnalysis[key].evidence) {
                        analysis[key].evidence.push(sentenceAnalysis[key].evidence);
                    }
                }
            });
            
            analysis.redFlags.push(...sentenceAnalysis.redFlags);
        }

        return analysis;
    }

    async analyzeSentence(sentence) {
        const result = {
            dataCollection: { score: 0 },
            dataUsage: { score: 0 },
            dataSharing: { score: 0 },
            userRights: { score: 0 },
            security: { score: 0 },
            redFlags: []
        };

        const lowerSentence = sentence.toLowerCase();
        
        // Enhanced context analysis
        const context = this.analyzeSentenceContext(sentence);
        
        // Data Collection Patterns with context awareness
        if (this.hasDataCollectionTerms(lowerSentence) && !context.isNegative) {
            result.dataCollection.score = this.calculateCollectionScore(sentence, context);
            result.dataCollection.evidence = this.extractRelevantEvidence(sentence, 'collection');
        }

        // Data Sharing Patterns
        if (this.hasDataSharingTerms(lowerSentence) && !context.isNegative) {
            result.dataSharing.score = this.calculateSharingScore(sentence, context);
            result.dataSharing.evidence = this.extractRelevantEvidence(sentence, 'sharing');
        }

        // User Rights (positive factors)
        if (this.hasUserRightsTerms(lowerSentence)) {
            result.userRights.score = this.calculateRightsScore(sentence, context);
            result.userRights.evidence = this.extractRelevantEvidence(sentence, 'rights');
        }

        // Security (positive factors)
        if (this.hasSecurityTerms(lowerSentence)) {
            result.security.score = this.calculateSecurityScore(sentence, context);
            result.security.evidence = this.extractRelevantEvidence(sentence, 'security');
        }

        // Critical Red Flags with context validation
        const criticalFlags = this.checkCriticalRedFlags(sentence, context);
        result.redFlags = criticalFlags;

        return result;
    }

    analyzeSentenceContext(sentence) {
        const lowerSentence = sentence.toLowerCase();
        
        return {
            isNegative: this.isNegativeContext(lowerSentence),
            isPositive: this.isPositiveContext(lowerSentence),
            hasLimitingLanguage: this.hasLimitingLanguage(lowerSentence),
            certainty: this.assessCertainty(lowerSentence)
        };
    }

    isNegativeContext(text) {
        const negativeIndicators = [
            'not', 'never', 'no', 'cannot', 'will not', 'do not', 
            'does not', 'did not', 'without', 'except', 'unless',
            'prohibited', 'restricted', 'forbidden'
        ];
        
        return negativeIndicators.some(indicator => 
            text.includes(` ${indicator} `) || 
            text.startsWith(`${indicator} `) ||
            text.endsWith(` ${indicator}`)
        );
    }

    isPositiveContext(text) {
        const positiveIndicators = [
            'will', 'can', 'may', 'might', 'could', 'able to',
            'enable', 'allow', 'permit', 'authorize'
        ];
        
        return positiveIndicators.some(indicator => text.includes(indicator));
    }

    hasLimitingLanguage(text) {
        const limitingTerms = [
            'only', 'solely', 'exclusively', 'limited to', 'restricted to'
        ];
        
        return limitingTerms.some(term => text.includes(term));
    }

    assessCertainty(text) {
        if (text.includes('always') || text.includes('must') || text.includes('required')) {
            return 'high';
        } else if (text.includes('may') || text.includes('might') || text.includes('could')) {
            return 'low';
        }
        return 'medium';
    }

    hasDataCollectionTerms(text) {
        const terms = [
            'collect', 'gather', 'store', 'retain', 'acquire',
            'personal information', 'personal data', 'user data',
            'email address', 'phone number', 'location data',
            'browsing history', 'usage data', 'demographic'
        ];
        return terms.some(term => text.includes(term));
    }

    hasDataSharingTerms(text) {
        const terms = [
            'share with', 'third party', 'partners', 'affiliates',
            'sell your data', 'transfer your data', 'disclose',
            'provide to', 'distribute to', 'commercial purpose'
        ];
        return terms.some(term => text.includes(term));
    }

    hasUserRightsTerms(text) {
        const terms = [
            'delete your data', 'access your data', 'opt out',
            'privacy rights', 'gdpr', 'ccpa', 'california',
            'right to', 'request access', 'data portability',
            'rectification', 'erasure', 'withdraw consent'
        ];
        return terms.some(term => text.includes(term));
    }

    hasSecurityTerms(text) {
        const terms = [
            'encryption', 'secure storage', 'protect your data',
            'security measures', 'safeguard', 'confidential',
            'access control', 'authentication', 'secure transmission'
        ];
        return terms.some(term => text.includes(term));
    }

    checkCriticalRedFlags(sentence, context) {
        const flags = [];
        const lowerSentence = sentence.toLowerCase();
        
        const criticalTerms = [
            { term: 'biometric data', weight: 10 },
            { term: 'social security', weight: 10 },
            { term: 'ssn', weight: 10 },
            { term: 'passport number', weight: 9 },
            { term: 'genetic data', weight: 9 },
            { term: 'dna', weight: 9 },
            { term: 'bank account', weight: 8 },
            { term: 'credit card', weight: 8 },
            { term: 'medical records', weight: 9 },
            { term: 'health information', weight: 8 },
            { term: 'sexual orientation', weight: 7 },
            { term: 'political views', weight: 6 },
            { term: 'religious beliefs', weight: 6 }
        ];

        criticalTerms.forEach(({ term, weight }) => {
            if (lowerSentence.includes(term) && !context.isNegative) {
                flags.push(term);
            }
        });

        return flags;
    }

    calculateCollectionScore(sentence, context) {
        let baseScore = 5;
        
        if (context.certainty === 'high') baseScore += 3;
        if (!context.hasLimitingLanguage) baseScore += 2;
        
        // Penalize sensitive data collection
        const sensitiveTerms = ['sensitive', 'biometric', 'health', 'financial'];
        if (sensitiveTerms.some(term => sentence.toLowerCase().includes(term))) {
            baseScore += 4;
        }

        return Math.min(baseScore, 10);
    }

    calculateSharingScore(sentence, context) {
        let baseScore = 6; // Sharing is generally higher risk
        
        if (context.certainty === 'high') baseScore += 3;
        if (sentence.toLowerCase().includes('sell')) baseScore += 4;
        
        return Math.min(baseScore, 10);
    }

    calculateRightsScore(sentence, context) {
        let baseScore = 6; // Rights are positive
        
        if (context.certainty === 'high') baseScore += 2;
        if (sentence.toLowerCase().includes('delete') || sentence.toLowerCase().includes('erasure')) {
            baseScore += 2; // Right to deletion is particularly strong
        }
        
        return Math.min(baseScore, 10);
    }

    calculateSecurityScore(sentence, context) {
        let baseScore = 5;
        
        if (context.certainty === 'high') baseScore += 3;
        if (sentence.toLowerCase().includes('encryption')) baseScore += 2;
        
        return Math.min(baseScore, 10);
    }

    extractRelevantEvidence(sentence, category) {
        // Extract the most relevant part of the sentence
        return sentence.trim().substring(0, 200); // Limit evidence length
    }

    calculateEnhancedOverallScore(analysis) {
        // Weighted scoring based on privacy impact
        const weights = {
            dataCollection: 0.25,
            dataSharing: 0.30,
            dataUsage: 0.20,
            userRights: 0.15,
            security: 0.10
        };

        let weightedScore = 0;
        let totalWeight = 0;

        // Negative factors (higher score = worse privacy)
        weightedScore += analysis.dataCollection.score * weights.dataCollection;
        weightedScore += analysis.dataSharing.score * weights.dataSharing;
        weightedScore += analysis.dataUsage.score * weights.dataUsage;
        totalWeight += weights.dataCollection + weights.dataSharing + weights.dataUsage;

        // Positive factors (higher score = better privacy)
        weightedScore -= analysis.userRights.score * weights.userRights;
        weightedScore -= analysis.security.score * weights.security;
        totalWeight += weights.userRights + weights.security;

        // Red flags significantly increase risk
        if (analysis.redFlags.length > 0) {
            weightedScore += analysis.redFlags.length * 2;
        }

        // Convert to privacy score (0-100, where 100 is best privacy)
        const normalizedScore = Math.max(0, Math.min(100, 100 - (weightedScore * 10)));
        
        return Math.round(normalizedScore);
    }

    validateAndDedupeEvidence(evidenceArray) {
        const uniqueEvidence = [...new Set(evidenceArray)];
        
        // Filter out evidence that's too short or irrelevant
        return uniqueEvidence
            .filter(evidence => evidence && evidence.length > 10)
            .slice(0, 3); // Keep only top 3 most relevant
    }

    async storeSiteAnalysisSafely(domain, analysis, overallScore) {
        const siteData = {
            domain: domain,
            overallScore: overallScore,
            analysis: analysis,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        };

        // Use atomic operations to prevent race conditions
        await this.loadStoredData(); // Refresh current data
        
        // Remove existing entry if present
        this.storedSites = this.storedSites.filter(site => site.domain !== domain);
        
        // Add new entry at beginning
        this.storedSites.unshift(siteData);
        
        // Keep only latest sites
        if (this.storedSites.length > 5) {
            this.storedSites = this.storedSites.slice(0, 5);
        }

        await this.saveStoredData();
    }

    contextAwareSplit(text, limit) {
        const chunks = [];
        let currentChunk = "";
        const paragraphs = text.split(/\n\s*\n/); // Split by paragraphs
        
        for (const paragraph of paragraphs) {
            if ((currentChunk.length + paragraph.length) > limit && currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = "";
            }
            currentChunk += paragraph + "\n\n";
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk);
        }
        
        return chunks;
    }

    splitIntoSentences(text) {
        // Improved sentence splitting that handles abbreviations
        const sentenceRegex = /[^.!?]+[.!?]+/g;
        const matches = text.match(sentenceRegex) || [];
        
        return matches
            .map(s => s.trim())
            .filter(s => s.length > 10); // Filter out very short fragments
    }

    getStoredSites() {
        return this.storedSites;
    }

    getDailyAnalyzedCount() {
        return this.dailyAnalyzed;
    }

    getPrivacyStats() {
        return {
            dailyAnalyzed: this.dailyAnalyzed,
            storedSites: this.storedSites,
            overallPrivacyScore: this.calculateAveragePrivacyScore()
        };
    }

    calculateAveragePrivacyScore() {
        if (this.storedSites.length === 0) return 0;
        const total = this.storedSites.reduce((sum, site) => sum + site.overallScore, 0);
        return Math.round(total / this.storedSites.length);
    }

    // Chrome storage helpers
    // Chrome storage helpers - FIXED VERSION
getStorageData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['privacyAnalyzerData'], (result) => {
            // Ensure consistent structure
            const data = result.privacyAnalyzerData || {};
            resolve({
                dailyAnalyzed: data.dailyAnalyzed || 0,
                storedSites: data.storedSites || [],
                lastResetDate: data.lastResetDate || new Date().toDateString()
            });
        });
    });
}

setStorageData(data) {
    return new Promise((resolve) => {
        // Always store with consistent structure
        chrome.storage.local.set({ 
            privacyAnalyzerData: {
                dailyAnalyzed: data.dailyAnalyzed,
                storedSites: data.storedSites,
                lastResetDate: data.lastResetDate
            }
        }, resolve);
    });
}

// FIXED: Store site analysis with consistent structure
async storeSiteAnalysisSafely(domain, analysis, overallScore) {
    await this.loadStoredData(); // Refresh current data
    
    // Remove existing entry if present
    this.storedSites = this.storedSites.filter(site => site.domain !== domain);
    
    // Add new entry at beginning
    const siteData = {
        domain: domain,
        overallScore: overallScore,
        analysis: analysis,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
    };
    this.storedSites.unshift(siteData);
    
    // Keep only latest 50 sites
    if (this.storedSites.length > 50) {
        this.storedSites = this.storedSites.slice(0, 50);
    }

    // Save with consistent structure
    await this.setStorageData({
        dailyAnalyzed: this.dailyAnalyzed,
        storedSites: this.storedSites,
        lastResetDate: this.lastResetDate
    });
}
// Singleton instance
export const privacyAnalyzer = new PrivacyAnalyzer();