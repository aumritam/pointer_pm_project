-- Mock feedback entries for testing
-- Support tickets (vague frustration)
INSERT INTO feedback (source, text, sentiment, theme) VALUES 
('support', 'The system is just not working properly for me today, very frustrating experience overall', 'negative', 'system issues'),
('support', 'Having issues with the platform again, this is getting really annoying', 'negative', 'platform problems'),
('support', 'Something is broken but I cannot figure out what exactly, please help', 'negative', 'general issues'),
('support', 'The performance has been terrible lately, making it hard to get work done', 'negative', 'performance'),
('support', 'Keep running into errors when trying to save my work', 'negative', 'errors'),

-- GitHub issues (repeated complaints)
('github', 'Memory leak issue still not fixed, this has been reported multiple times', 'negative', 'memory leak'),
('github', 'API rate limiting is too aggressive, blocking legitimate usage again', 'negative', 'api limits'),
('github', 'Documentation still outdated, examples do not match current API', 'negative', 'documentation'),
('github', 'Type definitions are incorrect, causing runtime errors in production', 'negative', 'typescript'),
('github', 'Build process keeps failing intermittently, please investigate', 'negative', 'build issues'),

-- Twitter mentions (mixed sentiment)
('twitter', 'Love the new features! Really making my workflow much better', 'positive', 'features'),
('twitter', 'The UI redesign looks amazing, great job team!', 'positive', 'ui design'),
('twitter', 'Having some trouble with the latest update, rolling back for now', 'negative', 'update issues'),
('twitter', 'Customer support was super helpful today, thank you!', 'positive', 'support'),
('twitter', 'Waiting for the bug fix mentioned in the roadmap', 'neutral', 'bug fixes'),

-- Community forum (enterprise issues)
('community', 'Enterprise deployment failing due to authentication issues with SSO provider', 'negative', 'enterprise auth'),
('community', 'Critical: Data corruption detected in bulk import operations for large datasets', 'negative', 'data corruption'),
('community', 'High severity: Security vulnerability in API key management system', 'negative', 'security'),
('community', 'Performance degradation in multi-tenant environment affecting all clients', 'negative', 'performance'),
('community', 'Integration with Salesforce connector broken after latest security patch', 'negative', 'integration');
