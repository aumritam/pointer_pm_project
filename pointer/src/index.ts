import { Env, Feedback } from './types';

/**
 * Feedback Escalation Worker
 * 
 * - POST /feedback - Accepts { source, text } and stores in D1
 * - GET /escalations - Returns top 3 issues for today
 * - GET / - Serves the dashboard UI
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method;

		// Handle POST /feedback requests
		if (method === 'POST' && url.pathname === '/feedback') {
			return handleFeedback(request, env);
		}

		// Handle GET /escalations requests
		if (method === 'GET' && url.pathname === '/escalations') {
			return handleEscalations(env);
		}

		// Serve dashboard UI at root path
		if (method === 'GET' && url.pathname === '/') {
			return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feedback Escalation Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen p-6">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900">Feedback Escalation Dashboard</h1>
            <p class="text-gray-600 mt-2">Monitor and analyze customer feedback across all channels</p>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Submit Feedback Section -->
            <section class="bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-semibold mb-4">Submit Feedback</h2>
                <form id="feedbackForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Source</label>
                        <select id="source" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="support">Support Ticket</option>
                            <option value="github">GitHub Issue</option>
                            <option value="twitter">Twitter Mention</option>
                            <option value="community">Community Forum</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Feedback Text</label>
                        <textarea id="text" rows="3" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                  placeholder="Enter feedback text..."></textarea>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                        Submit Feedback
                    </button>
                </form>
                <div id="submitResult" class="mt-4 hidden"></div>
            </section>

            <!-- Quick Actions -->
            <section class="bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
                <div class="space-y-3">
                    <button id="loadSeedData" class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                        Load Mock Data (20 entries)
                    </button>
                    <button id="refreshEscalations" class="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors">
                        Refresh Escalations
                    </button>
                </div>
                <div id="actionResult" class="mt-4 hidden"></div>
            </section>
        </div>

        <!-- Escalations Section -->
        <section class="bg-white rounded-lg shadow p-6 mt-6">
            <h2 class="text-xl font-semibold mb-4">Today's Top Escalations</h2>
            <div id="escalations" class="space-y-4">
                <p class="text-gray-500">Loading escalations...</p>
            </div>
        </section>

        <!-- Recent Feedback -->
        <section class="bg-white rounded-lg shadow p-6 mt-6">
            <h2 class="text-xl font-semibold mb-4">Recent Feedback</h2>
            <div id="recentFeedback" class="space-y-3">
                <p class="text-gray-500">Loading recent feedback...</p>
            </div>
        </section>
    </div>

    <script>
        const API_BASE = window.location.origin;
        
        // Submit feedback form
        document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const source = document.getElementById('source').value;
            const text = document.getElementById('text').value;
            
            if (!text.trim()) {
                showResult('submitResult', 'Please enter feedback text', 'error');
                return;
            }
            
            try {
                const response = await fetch(\`\${API_BASE}/feedback\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source, text })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showResult('submitResult', \`✅ Feedback submitted! Sentiment: \${result.sentiment}, Theme: \${result.theme}\`, 'success');
                    document.getElementById('text').value = '';
                    refreshEscalations();
                    loadRecentFeedback();
                } else {
                    showResult('submitResult', \`❌ Error: \${result.error}\`, 'error');
                }
            } catch (error) {
                showResult('submitResult', \`❌ Network error: \${error.message}\`, 'error');
            }
        });
        
        // Load seed data
        document.getElementById('loadSeedData').addEventListener('click', async () => {
            try {
                showResult('actionResult', 'Loading mock data...', 'info');
                
                const mockData = [
                    { source: 'support', text: 'The system is just not working properly for me today, very frustrating experience overall' },
                    { source: 'support', text: 'Having issues with the platform again, this is getting really annoying' },
                    { source: 'github', text: 'Memory leak issue still not fixed, this has been reported multiple times' },
                    { source: 'github', text: 'API rate limiting is too aggressive, blocking legitimate usage again' },
                    { source: 'twitter', text: 'Love the new features! Really making my workflow much better' },
                    { source: 'twitter', text: 'The UI redesign looks amazing, great job team!' },
                    { source: 'community', text: 'Enterprise deployment failing due to authentication issues with SSO provider' },
                    { source: 'community', text: 'Critical: Data corruption detected in bulk import operations for large datasets' },
                    { source: 'community', text: 'High severity: Security vulnerability in API key management system' },
                    { source: 'community', text: 'Performance degradation in multi-tenant environment affecting all clients' },
                    { source: 'support', text: 'Something is broken but I cannot figure out what exactly, please help' },
                    { source: 'support', text: 'The performance has been terrible lately, making it hard to get work done' },
                    { source: 'github', text: 'Documentation still outdated, examples do not match current API' },
                    { source: 'github', text: 'Type definitions are incorrect, causing runtime errors in production' },
                    { source: 'twitter', text: 'Having some trouble with the latest update, rolling back for now' },
                    { source: 'twitter', text: 'Customer support was super helpful today, thank you!' },
                    { source: 'twitter', text: 'Waiting for the bug fix mentioned in the roadmap' },
                    { source: 'support', text: 'Keep running into errors when trying to save my work' },
                    { source: 'github', text: 'Build process keeps failing intermittently, please investigate' },
                    { source: 'community', text: 'Integration with Salesforce connector broken after latest security patch' }
                ];
                
                let successCount = 0;
                let errorCount = 0;
                
                // Process feedback one by one with delays
                for (let i = 0; i < mockData.length; i++) {
                    const feedback = mockData[i];
                    try {
                        showResult('actionResult', \`Loading data... \${i + 1}/\${mockData.length}\`, 'info');
                        
                        const response = await fetch(\`\${API_BASE}/feedback\`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(feedback)
                        });
                        
                        if (response.ok) {
                            successCount++;
                            console.log(\`✅ Successfully submitted: \${feedback.source} - \${feedback.text.substring(0, 50)}...\`);
                        } else {
                            errorCount++;
                            const error = await response.json();
                            console.error(\`❌ Failed to submit: \${feedback.source} - \${error.error}\`);
                        }
                        
                        // Add delay between requests to avoid overwhelming the AI
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                    } catch (error) {
                        errorCount++;
                        console.error(\`❌ Network error for: \${feedback.source}\`, error);
                    }
                }
                
                if (successCount > 0) {
                    showResult('actionResult', \`✅ Loaded \${successCount}/\${mockData.length} mock feedback entries\`, 'success');
                    // Refresh the displays
                    setTimeout(() => {
                        refreshEscalations();
                        loadRecentFeedback();
                    }, 1000);
                } else {
                    showResult('actionResult', \`❌ Failed to load any mock data. Check console for details.\`, 'error');
                }
                
            } catch (error) {
                showResult('actionResult', \`❌ Error loading data: \${error.message}\`, 'error');
                console.error('Load seed data error:', error);
            }
        });
        
        // Refresh escalations
        document.getElementById('refreshEscalations').addEventListener('click', refreshEscalations);
        
        // Load escalations
        async function refreshEscalations() {
            try {
                const response = await fetch(\`\${API_BASE}/escalations\`);
                const data = await response.json();
                
                const container = document.getElementById('escalations');
                
                if (!response.ok) {
                    container.innerHTML = \`<p class="text-red-500">Error loading escalations: \${data.error}</p>\`;
                    return;
                }
                
                if (data.escalations.length === 0) {
                    container.innerHTML = '<p class="text-gray-500">No escalations for today. Submit some feedback to see results!</p>';
                    return;
                }
                
                container.innerHTML = data.escalations.map((escalation, index) => {
                    return '<div class="border-l-4 border-blue-500 pl-4 py-3 bg-white rounded-r-lg shadow-sm">' +
                        '<div class="flex justify-between items-start mb-3">' +
                            '<div>' +
                                '<h3 class="font-bold text-xl text-gray-900">' + escalation.theme + '</h3>' +
                                '<div class="flex items-center gap-4 mt-1">' +
                                    '<span class="text-2xl font-bold text-blue-600">Priority #' + (index + 1) + '</span>' +
                                    '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">Score: ' + escalation.score + '</span>' +
                                    '<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">' + escalation.feedbackCount + ' reports</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        
                        '<!-- Problem Summary -->' +
                        '<div class="bg-red-50 border border-red-200 rounded p-3 mb-3">' +
                            '<div class="flex items-center mb-2">' +
                                '<svg class="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">' +
                                    '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>' +
                                '</svg>' +
                                '<span class="font-semibold text-red-800">Problem Summary</span>' +
                            '</div>' +
                            '<p class="text-red-700">' + getProblemSummary(escalation) + '</p>' +
                        '</div>' +
                        
                        '<!-- Action Required -->' +
                        '<div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">' +
                            '<div class="flex items-center mb-2">' +
                                '<svg class="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">' +
                                    '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.414a1 1 0 00-1.414 0l-2.293-2.293a1 1 0 111.414-1.414L10 7.586l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414z" clip-rule="evenodd"/>' +
                                '</svg>' +
                                '<span class="font-semibold text-yellow-800">AI-Generated Action Items</span>' +
                            '</div>' +
                            '<ul class="space-y-1">' +
                                escalation.actionItems.map(action => 
                                    '<li class="text-yellow-700">• ' + action + '</li>'
                                ).join('') +
                            '</ul>' +
                        '</div>' +
                        
                        '<!-- Impact Assessment -->' +
                        '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">' +
                            '<div class="bg-gray-50 border border-gray-200 rounded p-3">' +
                                '<div class="flex items-center mb-2">' +
                                    '<svg class="w-4 h-4 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">' +
                                        '<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0116 16c0 1.1-.9 2-2 2H6a2 2 0 01-2-2c0-1.11.89-2 2-2h8c1.1 0 2 .9 2 2z"/>' +
                                    '</svg>' +
                                    '<span class="font-semibold text-gray-800">Affected Users</span>' +
                                '</div>' +
                                '<p class="text-gray-700">' + getAffectedUsers(escalation) + '</p>' +
                            '</div>' +
                            '<div class="bg-gray-50 border border-gray-200 rounded p-3">' +
                                '<div class="flex items-center mb-2">' +
                                    '<svg class="w-4 h-4 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">' +
                                        '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 102 0V6zm-1 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>' +
                                    '</svg>' +
                                    '<span class="font-semibold text-gray-800">Business Impact</span>' +
                                '</div>' +
                                '<p class="text-gray-700">' + getBusinessImpact(escalation) + '</p>' +
                            '</div>' +
                        '</div>' +
                        
                        '<!-- Evidence Details -->' +
                        '<div class="border-t pt-3">' +
                            '<div class="flex justify-between items-center mb-2">' +
                                '<span class="font-semibold text-gray-700">Key Feedback from ' + Object.keys(escalation.sourceBreakdown).length + ' channels:</span>' +
                                '<div class="flex gap-2 text-sm">' +
                                    '<span class="flex items-center">' +
                                        '<span class="w-3 h-3 bg-red-500 rounded-full mr-1"></span>' +
                                        escalation.sentimentBreakdown.negative + ' negative' +
                                    '</span>' +
                                    '<span class="flex items-center">' +
                                        '<span class="w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>' +
                                        escalation.sentimentBreakdown.neutral + ' neutral' +
                                    '</span>' +
                                    '<span class="flex items-center">' +
                                        '<span class="w-3 h-3 bg-green-500 rounded-full mr-1"></span>' +
                                        escalation.sentimentBreakdown.positive + ' positive' +
                                    '</span>' +
                                '</div>' +
                            '</div>' +
                            '<div class="space-y-2">' +
                                escalation.sampleFeedback.map(f => 
                                    '<div class="bg-gray-50 border-l-2 border-gray-300 pl-3 py-1">' +
                                        '<span class="inline-block px-2 py-1 text-xs rounded ' + getSourceColor(f.source) + ' mr-2">' + f.source + '</span>' +
                                        '<span class="text-sm text-gray-700">"' + f.text + '"</span>' +
                                    '</div>'
                                ).join('') +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
                
            } catch (error) {
                document.getElementById('escalations').innerHTML = '<p class="text-red-500">Network error: ' + error.message + '</p>';
            }
        }
        
        // Load recent feedback
        async function loadRecentFeedback() {
            try {
                const response = await fetch(API_BASE + '/escalations');
                const data = await response.json();
                
                const container = document.getElementById('recentFeedback');
                
                if (!response.ok || data.escalations.length === 0) {
                    container.innerHTML = '<p class="text-gray-500">No recent feedback available</p>';
                    return;
                }
                
                // Show sample feedback from top escalations with context
                const allSamples = data.escalations.flatMap(e => e.sampleFeedback);
                container.innerHTML = '<h4 class="font-semibold text-gray-700 mb-3">Latest Customer Feedback</h4>' +
                    allSamples.slice(0, 5).map(f => 
                        '<div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">' +
                            '<div class="flex justify-between items-start mb-2">' +
                                '<div class="flex gap-2">' +
                                    '<span class="inline-block px-2 py-1 text-xs rounded font-medium ' + getSourceColor(f.source) + '">' + f.source + '</span>' +
                                    '<span class="inline-block px-2 py-1 text-xs rounded font-medium ' + getSentimentColor(f.sentiment) + '">' + f.sentiment + '</span>' +
                                '</div>' +
                                '<span class="text-xs text-gray-500">Recent</span>' +
                            '</div>' +
                            '<p class="text-sm text-gray-800">"' + f.text + '"</p>' +
                            '<div class="mt-2 text-xs text-gray-600">' +
                                (f.sentiment === 'negative' ? '⚠️ Requires attention' : f.sentiment === 'positive' ? '✅ Positive feedback' : 'ℹ️ Neutral observation') +
                            '</div>' +
                        '</div>'
                    ).join('');
                
            } catch (error) {
                document.getElementById('recentFeedback').innerHTML = '<p class="text-red-500">Error loading feedback: ' + error.message + '</p>';
            }
        }
        
        function getSourceColor(source) {
            const colors = {
                support: 'bg-blue-100 text-blue-800',
                github: 'bg-gray-100 text-gray-800', 
                twitter: 'bg-sky-100 text-sky-800',
                community: 'bg-purple-100 text-purple-800'
            };
            return colors[source] || 'bg-gray-100 text-gray-800';
        }
        
        function getSentimentColor(sentiment) {
            const colors = {
                positive: 'bg-green-100 text-green-800',
                neutral: 'bg-yellow-100 text-yellow-800',
                negative: 'bg-red-100 text-red-800'
            };
            return colors[sentiment] || 'bg-gray-100 text-gray-800';
        }
        
        function getProblemSummary(escalation) {
            const theme = escalation.theme.toLowerCase();
            const negativeCount = escalation.sentimentBreakdown.negative;
            const totalCount = escalation.feedbackCount;
            const sources = Object.keys(escalation.sourceBreakdown);
            
            // High-priority enterprise issues
            if (theme.includes('security') || theme.includes('vulnerability')) {
                return 'Security vulnerability requiring immediate attention. Multiple users reporting potential security risks that could compromise data or system integrity.';
            }
            if (theme.includes('data integrity') || theme.includes('corruption')) {
                return 'Critical data integrity issue. Users experiencing data loss or corruption during operations, potentially affecting business continuity.';
            }
            if (theme.includes('enterprise') && (theme.includes('auth') || theme.includes('sso'))) {
                return 'Enterprise authentication failure. Business customers unable to access systems due to SSO integration issues.';
            }
            
            // Performance and reliability issues
            if (theme.includes('performance') || theme.includes('slow')) {
                return 'System performance degradation affecting ' + totalCount + ' users. Response times and user experience significantly impacted.';
            }
            if (theme.includes('memory') || theme.includes('leak')) {
                return 'Memory leak causing system instability. Long-running processes consuming excessive resources and potentially causing crashes.';
            }
            if (theme.includes('system errors') || theme.includes('broken')) {
                return 'System errors and crashes affecting user workflows. Multiple failures reported requiring immediate investigation.';
            }
            
            // API and integration issues
            if (theme.includes('api') && theme.includes('limit')) {
                return 'API rate limiting too restrictive. Legitimate business usage being blocked, affecting customer workflows.';
            }
            if (theme.includes('api')) {
                return 'API functionality issues reported. Developers experiencing problems with API endpoints and responses.';
            }
            if (theme.includes('integration') || theme.includes('connector')) {
                return 'Third-party integration failure. Critical business integrations not functioning, disrupting customer workflows.';
            }
            
            // User experience issues
            if (theme.includes('user interface') || theme.includes('ui')) {
                return 'User interface problems affecting usability. Customers reporting difficulty with navigation, buttons, or visual elements.';
            }
            
            // Documentation and developer experience
            if (theme.includes('documentation') || theme.includes('docs')) {
                return 'Documentation outdated and inaccurate. Developers unable to implement features correctly due to incorrect examples.';
            }
            if (theme.includes('build deployment') || theme.includes('build')) {
                return 'Build process failures. Development and deployment workflows disrupted, affecting team productivity.';
            }
            
            // Feature and billing issues
            if (theme.includes('feature request')) {
                return 'Feature requests and enhancement suggestions. Users requesting additional functionality for improved workflows.';
            }
            if (theme.includes('billing') || theme.includes('price')) {
                return 'Billing and pricing concerns. Customers reporting issues with charges, invoices, or pricing structure.';
            }
            
            // Customer support issues
            if (theme.includes('customer support') || theme.includes('support')) {
                return 'Customer support experience issues. Users reporting problems with getting help or support responsiveness.';
            }
            
            // Update issues
            if (theme.includes('updates') || theme.includes('upgrade')) {
                return 'Software update and version issues. Problems with new releases, upgrades, or version compatibility.';
            }
            
            // General issues with high negative sentiment
            if (negativeCount > totalCount * 0.7) {
                return 'Widespread user dissatisfaction. ' + negativeCount + ' out of ' + totalCount + ' users reporting negative experiences.';
            }
            
            // Default summary
            return 'User-reported issue affecting ' + totalCount + ' users across ' + sources.length + ' channels. Requires investigation and resolution.';
        }
        
        function getActionRequired(escalation) {
            const theme = escalation.theme.toLowerCase();
            const hasCommunity = escalation.sourceBreakdown.community > 0;
            const hasSupport = escalation.sourceBreakdown.support > 0;
            
            // Security actions
            if (theme.includes('security') || theme.includes('vulnerability')) {
                return 'IMMEDIATE: Security team investigation required. Patch needed within 24-48 hours. Communicate security advisory to affected customers.';
            }
            if (theme.includes('data corruption')) {
                return 'URGENT: Data integrity team investigation. Backup verification required. Communicate data recovery options to affected users.';
            }
            
            // Enterprise customer actions
            if (theme.includes('enterprise') && hasCommunity) {
                return 'HIGH: Enterprise customer success team engagement. SSO vendor coordination needed. Provide workaround solutions immediately.';
            }
            
            // Performance actions
            if (theme.includes('performance')) {
                return 'HIGH: Infrastructure team performance analysis. Resource allocation review. Monitor system metrics and implement scaling solutions.';
            }
            if (theme.includes('memory leak')) {
                return 'MEDIUM: Engineering team code review. Memory profiling required. Schedule patch for next release cycle.';
            }
            
            // API actions
            if (theme.includes('api') && theme.includes('limit')) {
                return 'MEDIUM: API team review of rate limits. Consider tiered limits or enterprise quotas. Update API documentation.';
            }
            
            // Integration actions
            if (theme.includes('integration')) {
                return 'MEDIUM: Partnerships team coordination. Third-party vendor engagement. Test integration compatibility.';
            }
            
            // Documentation actions
            if (theme.includes('documentation')) {
                return 'LOW: Technical writing team update. Code examples review. Developer experience testing required.';
            }
            
            // Default action based on sources
            if (hasCommunity && hasSupport) {
                return 'MEDIUM: Cross-functional investigation required. Customer success and engineering coordination needed.';
            }
            
            return 'LOW: Monitor for additional reports. Standard issue triage and response procedures apply.';
        }
        
        function getAffectedUsers(escalation) {
            const totalCount = escalation.feedbackCount;
            const hasCommunity = escalation.sourceBreakdown.community > 0;
            const hasSupport = escalation.sourceBreakdown.support > 0;
            
            if (hasCommunity) {
                return totalCount + '+ enterprise customers affected. High-value accounts at risk of churn.';
            }
            if (hasSupport) {
                return totalCount + ' support ticket filers. Paying customers requiring immediate assistance.';
            }
            
            const sourceCount = Object.keys(escalation.sourceBreakdown).length;
            if (sourceCount > 2) {
                return totalCount + ' users across multiple channels. Widespread issue requiring coordinated response.';
            }
            
            return totalCount + ' users affected. Monitor for escalation patterns.';
        }
        
        function getBusinessImpact(escalation) {
            const theme = escalation.theme.toLowerCase();
            const negativeCount = escalation.sentimentBreakdown.negative;
            const hasCommunity = escalation.sourceBreakdown.community > 0;
            
            // High-impact issues
            if (theme.includes('security') || theme.includes('vulnerability')) {
                return 'CRITICAL: Potential data breach, regulatory compliance issues, brand damage, customer trust impact.';
            }
            if (theme.includes('data corruption')) {
                return 'CRITICAL: Data loss, business continuity disruption, potential legal liability, customer revenue impact.';
            }
            if (hasCommunity && theme.includes('enterprise')) {
                return 'HIGH: Enterprise customer revenue at risk, potential contract violations, SLA penalties.';
            }
            
            // Medium-impact issues
            if (theme.includes('performance')) {
                return 'MEDIUM: User productivity loss, customer satisfaction decline, potential churn risk.';
            }
            if (theme.includes('api') && theme.includes('limit')) {
                return 'MEDIUM: Partner ecosystem disruption, developer experience issues, platform adoption barriers.';
            }
            
            // Lower-impact but still important
            if (negativeCount > escalation.feedbackCount * 0.6) {
                return 'MEDIUM: Brand reputation impact, customer satisfaction decline, social media risk.';
            }
            
            return 'LOW: User experience impact, support team resource allocation, monitoring overhead.';
        }
        
        function showResult(elementId, message, type) {
            const element = document.getElementById(elementId);
            element.className = 'mt-4 p-3 rounded-md text-sm';
            
            const colors = {
                success: 'bg-green-100 text-green-800',
                error: 'bg-red-100 text-red-800',
                info: 'bg-blue-100 text-blue-800',
                warning: 'bg-yellow-100 text-yellow-800'
            };
            
            element.className += ' ' + colors[type];
            element.textContent = message;
            element.classList.remove('hidden');
            
            setTimeout(() => element.classList.add('hidden'), 5000);
        }
        
        // Initial load
        refreshEscalations();
        loadRecentFeedback();
    </script>
</body>
</html>
			`, {
				headers: { 'Content-Type': 'text/html' }
			});
		}

		// Default response
		return new Response('Feedback Escalation Worker', { status: 200 });
	},
} satisfies ExportedHandler<Env>;

// Handle POST /feedback requests
async function handleFeedback(request: Request, env: Env): Promise<Response> {
	try {
		// Parse request body
		const body = await request.json() as { source?: string; text?: string };
		
		// Validate required fields
		if (!body.text || !body.source) {
			return new Response(
				JSON.stringify({ error: 'Missing required fields: source, text' }), 
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		let sentiment = 'neutral';
		let theme = 'general';

		try {
			// Use Workers AI to classify sentiment and extract theme
			const aiResponse = await env.ai.run('@cf/meta/llama-3-8b-instruct', {
				messages: [
					{
						role: 'user',
						content: `Classify the sentiment (positive, neutral, negative) and extract a 1-2 word theme for this feedback: "${body.text}". Respond in JSON format: {"sentiment": "positive|neutral|negative", "theme": "theme"}`
					}
				],
				max_tokens: 50
			});

			// Parse AI response
			try {
				const aiResult = JSON.parse(aiResponse.response);
				sentiment = aiResult.sentiment || 'neutral';
				theme = aiResult.theme || 'general';
			} catch (e) {
				// Fallback if AI response parsing fails
				console.error('AI response parsing failed:', e);
				// Use simple keyword-based fallback
				sentiment = body.text.toLowerCase().includes('good') || body.text.toLowerCase().includes('love') || body.text.toLowerCase().includes('great') ? 'positive' :
						   body.text.toLowerCase().includes('bad') || body.text.toLowerCase().includes('broken') || body.text.toLowerCase().includes('error') ? 'negative' : 'neutral';
				
				// Better theme classification based on keywords
				theme = extractThemeFromText(body.text);
			}
		} catch (aiError) {
			console.error('Workers AI call failed:', aiError);
			// Fallback classification without AI
			sentiment = body.text.toLowerCase().includes('good') || body.text.toLowerCase().includes('love') || body.text.toLowerCase().includes('great') ? 'positive' :
					   body.text.toLowerCase().includes('bad') || body.text.toLowerCase().includes('broken') || body.text.toLowerCase().includes('error') ? 'negative' : 'neutral';
			theme = extractThemeFromText(body.text);
		}

		// Insert into D1 database using pointer_db binding
		const result = await env.pointer_db.prepare(`
			INSERT INTO feedback (source, text, sentiment, theme) 
			VALUES (?, ?, ?, ?)
		`).bind(body.source, body.text, sentiment, theme).run();

		// Return success response
		return new Response(
			JSON.stringify({ 
				success: true, 
				id: result.meta.last_row_id,
				sentiment: sentiment,
				theme: theme,
				message: 'Feedback stored successfully'
			}), 
			{ status: 201, headers: { 'Content-Type': 'application/json' } }
		);

	} catch (error) {
		console.error('handleFeedback error:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }), 
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

// Helper function to extract theme from text when AI fails
function extractThemeFromText(text: string): string {
	const lowerText = text.toLowerCase();
	
	// Security issues
	if (lowerText.includes('security') || lowerText.includes('vulnerability') || lowerText.includes('auth') || lowerText.includes('password') || lowerText.includes('login')) {
		return 'security';
	}
	
	// Performance issues
	if (lowerText.includes('slow') || lowerText.includes('performance') || lowerText.includes('lag') || lowerText.includes('timeout')) {
		return 'performance';
	}
	
	// Data issues
	if (lowerText.includes('data') || lowerText.includes('corruption') || lowerText.includes('loss') || lowerText.includes('backup')) {
		return 'data integrity';
	}
	
	// API issues
	if (lowerText.includes('api') || lowerText.includes('endpoint') || lowerText.includes('request') || lowerText.includes('response')) {
		return 'api';
	}
	
	// UI/UX issues
	if (lowerText.includes('ui') || lowerText.includes('interface') || lowerText.includes('design') || lowerText.includes('button') || lowerText.includes('menu')) {
		return 'user interface';
	}
	
	// Integration issues
	if (lowerText.includes('integration') || lowerText.includes('connector') || lowerText.includes('sync') || lowerText.includes('connect')) {
		return 'integration';
	}
	
	// Build/Deployment issues
	if (lowerText.includes('build') || lowerText.includes('deploy') || lowerText.includes('compile') || lowerText.includes('ci/cd')) {
		return 'build deployment';
	}
	
	// Memory issues
	if (lowerText.includes('memory') || lowerText.includes('leak') || lowerText.includes('ram') || lowerText.includes('crash')) {
		return 'memory';
	}
	
	// Documentation issues
	if (lowerText.includes('documentation') || lowerText.includes('docs') || lowerText.includes('guide') || lowerText.includes('example')) {
		return 'documentation';
	}
	
	// Feature requests
	if (lowerText.includes('feature') || lowerText.includes('add') || lowerText.includes('want') || lowerText.includes('need')) {
		return 'feature request';
	}
	
	// Billing/Pricing
	if (lowerText.includes('billing') || lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('charge')) {
		return 'billing';
	}
	
	// System errors
	if (lowerText.includes('error') || lowerText.includes('broken') || lowerText.includes('fail') || lowerText.includes('bug')) {
		return 'system errors';
	}
	
	// Enterprise issues
	if (lowerText.includes('enterprise') || lowerText.includes('sso') || lowerText.includes('organization') || lowerText.includes('company')) {
		return 'enterprise';
	}
	
	// Default to more specific categories
	if (lowerText.includes('help') || lowerText.includes('support') || lowerText.includes('assist')) {
		return 'customer support';
	}
	
	if (lowerText.includes('update') || lowerText.includes('upgrade') || lowerText.includes('version') || lowerText.includes('release')) {
		return 'updates';
	}
	
	return 'general feedback';
}

// Handle GET /escalations requests
async function handleEscalations(env: Env): Promise<Response> {
	try {
		// Get feedback from today (last 24 hours)
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Query feedback from today
		const feedbackQuery = await env.pointer_db.prepare(`
			SELECT source, text, sentiment, theme, created_at 
			FROM feedback 
			WHERE created_at >= ? AND created_at < ?
			ORDER BY created_at DESC
		`).bind(today.toISOString(), tomorrow.toISOString()).all();

		if (!feedbackQuery.results || feedbackQuery.results.length === 0) {
			return new Response(
				JSON.stringify({ escalations: [], message: 'No feedback from today' }), 
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Group feedback by theme and calculate scores
		const themeGroups = new Map<string, Feedback[]>();
		
		// Group by theme
		feedbackQuery.results.forEach((feedback: Feedback) => {
			const theme = feedback.theme || 'general';
			if (!themeGroups.has(theme)) {
				themeGroups.set(theme, []);
			}
			themeGroups.get(theme)!.push(feedback);
		});

		// Calculate scores for each theme and generate AI tasks
		const scoredThemes = await Promise.all(Array.from(themeGroups.entries()).map(async ([theme, feedbacks]) => {
			const score = calculateEscalationScore(feedbacks);
			
			// Generate AI-powered action items
			let actionItems = [];
			try {
				const allFeedbackText = feedbacks.map(f => f.text).join('\n');
				const aiResponse = await env.ai.run('@cf/meta/llama-3-8b-instruct', {
					messages: [
						{
							role: 'user',
							content: `Based on this customer feedback about "${theme}", generate 3-4 specific, actionable task bullet points for a product manager. Each bullet should start with a verb and be concrete. Focus on what needs to be investigated, fixed, or improved.\n\nFeedback:\n${allFeedbackText}\n\nRespond with only the bullet points, one per line, starting with •`
						}
					],
					max_tokens: 150
				});
				
				// Parse AI response into bullet points
				const aiText = aiResponse.response;
				actionItems = aiText.split('\n')
					.filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-'))
					.map((line: string) => line.trim().replace(/^[•-]\s*/, ''))
					.filter((item: string) => item.length > 0)
					.slice(0, 4); // Max 4 bullet points
					
			} catch (aiError) {
				console.error('AI task generation failed:', aiError);
				// Fallback to template-based tasks
				actionItems = generateFallbackTasks(theme, feedbacks);
			}

			return {
				theme,
				score,
				feedbackCount: feedbacks.length,
				sentimentBreakdown: getSentimentBreakdown(feedbacks),
				sourceBreakdown: getSourceBreakdown(feedbacks),
				sampleFeedback: feedbacks.slice(0, 3).map(f => ({
					source: f.source,
					text: f.text.substring(0, 100) + (f.text.length > 100 ? '...' : ''),
					sentiment: f.sentiment
				})),
				actionItems: actionItems
			};
		}));

		// Sort by score (highest first) and take top 3
		const topEscalations = scoredThemes
			.sort((a, b) => b.score - a.score)
			.slice(0, 3);

		return new Response(
			JSON.stringify({ 
				escalations: topEscalations,
				totalThemes: themeGroups.size,
				totalFeedback: feedbackQuery.results.length,
				generatedAt: new Date().toISOString()
			}), 
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);

	} catch (error) {
		return new Response(
			JSON.stringify({ error: 'Internal server error' }), 
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

// Generate fallback tasks when AI fails
function generateFallbackTasks(theme: string, feedbacks: Feedback[]): string[] {
	const taskTemplates: { [key: string]: string[] } = {
		'security': [
			'Conduct immediate security audit of reported vulnerability',
			'Engage security team to assess risk level and impact',
			'Prepare security advisory for affected customers',
			'Schedule emergency patch if critical vulnerability confirmed'
		],
		'performance': [
			'Analyze system metrics to identify performance bottlenecks',
			'Review infrastructure resource allocation and scaling',
			'Profile application code for optimization opportunities',
			'Monitor system performance after implementing fixes'
		],
		'data integrity': [
			'Investigate data corruption reports and identify root cause',
			'Verify backup integrity and recovery procedures',
			'Implement data validation checks to prevent future corruption',
			'Communicate data recovery options to affected users'
		],
		'system errors': [
			'Review error logs and identify common failure patterns',
			'Conduct root cause analysis for reported system failures',
			'Implement improved error handling and logging',
			'Test fixes in staging environment before deployment'
		],
		'api': [
			'Review API endpoint performance and error rates',
			'Analyze API usage patterns and identify bottlenecks',
			'Update API documentation with current behavior',
			'Implement rate limiting adjustments if needed'
		],
		'integration': [
			'Test third-party integration connectors and APIs',
			'Review recent changes that may have broken integrations',
			'Contact integration partners about known issues',
			'Provide temporary workarounds for affected customers'
		],
		'user interface': [
			'Conduct usability testing of reported UI issues',
			'Review UI components for accessibility and responsiveness',
			'Analyze user behavior data to identify friction points',
			'Prioritize UI fixes based on user impact'
		],
		'documentation': [
			'Audit documentation for accuracy and completeness',
			'Update code examples to match current API behavior',
			'Add troubleshooting guides for common issues',
			'Review documentation with technical writers'
		]
	};

	const defaultTasks = [
		'Investigate reported issues and identify root cause',
		'Engage appropriate engineering teams for resolution',
		'Communicate status and timeline to affected users',
		'Monitor for additional reports and patterns'
	];

	return taskTemplates[theme] || defaultTasks;
}

// Opinionated scoring model
function calculateEscalationScore(feedbacks: Feedback[]): number {
	let score = 0;
	
	// Base score: frequency multiplier (more feedback = higher priority)
	score += feedbacks.length * 10;
	
	// Sentiment severity scoring
	feedbacks.forEach(feedback => {
		switch (feedback.sentiment) {
			case 'negative':
				score += 25; // High weight for negative sentiment
				break;
			case 'neutral':
				score += 5; // Low weight for neutral
				break;
			case 'positive':
				score += 1; // Minimal weight for positive
				break;
		}
	});
	
	// Source importance scoring
	feedbacks.forEach(feedback => {
		switch (feedback.source) {
			case 'community':
				score += 20; // High weight for community (enterprise issues)
				break;
			case 'support':
				score += 15; // Medium-high weight for support tickets
				break;
			case 'github':
				score += 10; // Medium weight for GitHub issues
				break;
			case 'twitter':
				score += 5; // Lower weight for Twitter mentions
				break;
		}
	});
	
	// Bonus for themes with multiple sources
	const uniqueSources = new Set(feedbacks.map(f => f.source)).size;
	if (uniqueSources > 1) {
		score += uniqueSources * 8; // Multi-source bonus
	}
	
	// Bonus for high negative sentiment concentration
	const negativeCount = feedbacks.filter(f => f.sentiment === 'negative').length;
	const negativeRatio = negativeCount / feedbacks.length;
	if (negativeRatio > 0.7) {
		score += 30; // High negativity bonus
	}
	
	return Math.round(score);
}

// Helper function to get sentiment breakdown
function getSentimentBreakdown(feedbacks: Feedback[]): { positive: number; negative: number; neutral: number } {
	const breakdown = { positive: 0, negative: 0, neutral: 0 };
	feedbacks.forEach(feedback => {
		breakdown[feedback.sentiment as keyof typeof breakdown]++;
	});
	return breakdown;
}

// Helper function to get source breakdown  
function getSourceBreakdown(feedbacks: Feedback[]): { [key: string]: number } {
	const breakdown: { [key: string]: number } = {};
	feedbacks.forEach(feedback => {
		breakdown[feedback.source] = (breakdown[feedback.source] || 0) + 1;
	});
	return breakdown;
}
