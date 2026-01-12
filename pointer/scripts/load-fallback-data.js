// Fallback data loading script - direct SQL insertion
const mockFeedbackWithClassifications = [
    { source: 'support', text: 'The system is just not working properly for me today, very frustrating experience overall', sentiment: 'negative', theme: 'system issues' },
    { source: 'support', text: 'Having issues with the platform again, this is getting really annoying', sentiment: 'negative', theme: 'platform problems' },
    { source: 'github', text: 'Memory leak issue still not fixed, this has been reported multiple times', sentiment: 'negative', theme: 'memory leak' },
    { source: 'github', text: 'API rate limiting is too aggressive, blocking legitimate usage again', sentiment: 'negative', theme: 'api limits' },
    { source: 'twitter', text: 'Love the new features! Really making my workflow much better', sentiment: 'positive', theme: 'features' },
    { source: 'twitter', text: 'The UI redesign looks amazing, great job team!', sentiment: 'positive', theme: 'ui design' },
    { source: 'community', text: 'Enterprise deployment failing due to authentication issues with SSO provider', sentiment: 'negative', theme: 'enterprise auth' },
    { source: 'community', text: 'Critical: Data corruption detected in bulk import operations for large datasets', sentiment: 'negative', theme: 'data corruption' },
    { source: 'community', text: 'High severity: Security vulnerability in API key management system', sentiment: 'negative', theme: 'security' },
    { source: 'community', text: 'Performance degradation in multi-tenant environment affecting all clients', sentiment: 'negative', theme: 'performance' },
    { source: 'support', text: 'Something is broken but I cannot figure out what exactly, please help', sentiment: 'negative', theme: 'general issues' },
    { source: 'support', text: 'The performance has been terrible lately, making it hard to get work done', sentiment: 'negative', theme: 'performance' },
    { source: 'github', text: 'Documentation still outdated, examples do not match current API', sentiment: 'negative', theme: 'documentation' },
    { source: 'github', text: 'Type definitions are incorrect, causing runtime errors in production', sentiment: 'negative', theme: 'typescript' },
    { source: 'twitter', text: 'Having some trouble with the latest update, rolling back for now', sentiment: 'negative', theme: 'update issues' },
    { source: 'twitter', text: 'Customer support was super helpful today, thank you!', sentiment: 'positive', theme: 'support' },
    { source: 'twitter', text: 'Waiting for the bug fix mentioned in the roadmap', sentiment: 'neutral', theme: 'bug fixes' },
    { source: 'support', text: 'Keep running into errors when trying to save my work', sentiment: 'negative', theme: 'errors' },
    { source: 'github', text: 'Build process keeps failing intermittently, please investigate', sentiment: 'negative', theme: 'build issues' },
    { source: 'community', text: 'Integration with Salesforce connector broken after latest security patch', sentiment: 'negative', theme: 'integration' }
];

// Generate SQL for direct insertion
const sqlStatements = mockFeedbackWithClassifications.map(feedback => 
    `INSERT INTO feedback (source, text, sentiment, theme) VALUES ('${feedback.source}', '${feedback.text.replace(/'/g, "''")}', '${feedback.sentiment}', '${feedback.theme}');`
).join('\n');

console.log('SQL Statements:');
console.log(sqlStatements);

// Also save to file for easy execution
const fs = require('fs');
fs.writeFileSync('fallback-data.sql', sqlStatements);
console.log('\nSaved to fallback-data.sql - run with: wrangler d1 execute pointer-db --file=fallback-data.sql --remote');
