// Debug utilities for testing the privacy analyzer
class PrivacyAnalyzerDebug {
    static async testCompleteFlow() {
        console.log('🧪 Testing Privacy Analyzer Complete Flow...');
        
        try {
            // Test 1: Storage
            await this.testStorage();
            
            // Test 2: Analysis
            await this.testAnalysis();
            
            // Test 3: UI Updates
            await this.testUIUpdates();
            
            console.log('✅ All tests passed!');
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }
    
    static async testStorage() {
        console.log('📦 Testing storage...');
        
        const analyzer = new PrivacyAnalyzer();
        await analyzer.init();
        
        // Test data
        const testAnalysis = {
            dataCollection: { score: 70, evidence: ['Test collection'] },
            dataUsage: { score: 60, evidence: ['Test usage'] },
            dataSharing: { score: 80, evidence: ['Test sharing'] },
            userRights: { score: 40, evidence: ['Test rights'] },
            security: { score: 50, evidence: ['Test security'] },
            redFlags: ['test-flag']
        };
        
        // Store test data
        await analyzer.storeSiteAnalysisSafely('test-domain.com', testAnalysis, 75);
        
        // Retrieve and verify
        const stored = await analyzer.getStorageData();
        console.log('Stored data:', stored);
        
        if (!stored.storedSites || stored.storedSites.length === 0) {
            throw new Error('Storage test failed - no sites stored');
        }
        
        console.log('✅ Storage test passed');
    }
    
    static async testAnalysis() {
        console.log('🔍 Testing analysis...');
        
        const analyzer = new PrivacyAnalyzer();
        await analyzer.init();
        
        const testText = `
            We collect your personal information including name, email, and location data.
            We share this information with our partners for marketing purposes.
            You have the right to delete your data upon request.
            We use encryption to protect your information.
        `;
        
        const result = await analyzer.analyzePrivacyPolicy(testText, 'test.com');
        
        if (!result.success) {
            throw new Error('Analysis test failed: ' + result.error);
        }
        
        console.log('Analysis result:', result);
        console.log('✅ Analysis test passed');
    }
    
    static async testUIUpdates() {
        console.log('🎨 Testing UI updates...');
        
        // Test with mock data
        const mockData = {
            overallPrivacyScore: 75,
            dailyAnalyzed: 3,
            storedSites: [
                {
                    domain: "example.com",
                    overallScore: 80,
                    analysis: {
                        dataCollection: { score: 65, evidence: ['Collects email'] },
                        dataUsage: { score: 70, evidence: ['Uses for personalization'] },
                        dataSharing: { score: 85, evidence: ['Shares with advertisers'] },
                        userRights: { score: 60, evidence: ['Allows data deletion'] },
                        security: { score: 75, evidence: ['Uses encryption'] },
                        redFlags: []
                    }
                }
            ]
        };
        
        // This will be called by the actual UI
        if (typeof updatePrivacyAnalysisUI === 'function') {
            updatePrivacyAnalysisUI(mockData);
            console.log('✅ UI update test completed');
        } else {
            console.log('⚠️ UI functions not available in this context');
        }
    }
}

// Run tests when in debug mode
if (typeof window !== 'undefined' && window.location.hash === '#debug') {
    setTimeout(() => PrivacyAnalyzerDebug.testCompleteFlow(), 1000);
}