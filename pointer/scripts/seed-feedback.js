// Mock feedback data generator
const mockFeedback = [
	// Support tickets (vague frustration)
	{
		source: 'support',
		text: 'The system is just not working properly for me today, very frustrating experience overall'
	},
	{
		source: 'support', 
		text: 'Having issues with the platform again, this is getting really annoying'
	},
	{
		source: 'support',
		text: 'Something is broken but I cannot figure out what exactly, please help'
	},
	{
		source: 'support',
		text: 'The performance has been terrible lately, making it hard to get work done'
	},
	{
		source: 'support',
		text: 'Keep running into errors when trying to save my work'
	},
	
	// GitHub issues (repeated complaints)
	{
		source: 'github',
		text: 'Memory leak issue still not fixed, this has been reported multiple times'
	},
	{
		source: 'github',
		text: 'API rate limiting is too aggressive, blocking legitimate usage again'
	},
	{
		source: 'github',
		text: 'Documentation still outdated, examples do not match current API'
	},
	{
		source: 'github',
		text: 'Type definitions are incorrect, causing runtime errors in production'
	},
	{
		source: 'github',
		text: 'Build process keeps failing intermittently, please investigate'
	},
	
	// Twitter mentions (mixed sentiment)
	{
		source: 'twitter',
		text: 'Love the new features! Really making my workflow much better'
	},
	{
		source: 'twitter',
		text: 'The UI redesign looks amazing, great job team!'
	},
	{
		source: 'twitter',
		text: 'Having some trouble with the latest update, rolling back for now'
	},
	{
		source: 'twitter',
		text: 'Customer support was super helpful today, thank you!'
	},
	{
		source: 'twitter',
		text: 'Waiting for the bug fix mentioned in the roadmap'
	},
	
	// Community forum (enterprise issues)
	{
		source: 'community',
		text: 'Enterprise deployment failing due to authentication issues with SSO provider'
	},
	{
		source: 'community',
		text: 'Critical: Data corruption detected in bulk import operations for large datasets'
	},
	{
		source: 'community',
		text: 'High severity: Security vulnerability in API key management system'
	},
	{
		source: 'community',
		text: 'Performance degradation in multi-tenant environment affecting all clients'
	},
	{
		source: 'community',
		text: 'Integration with Salesforce connector broken after latest security patch'
	}
];

// Function to insert feedback via API
async function seedFeedback() {
	const baseUrl = 'http://localhost:8787'; // Adjust if your worker runs elsewhere
	
	for (const feedback of mockFeedback) {
		try {
			const response = await fetch(`${baseUrl}/feedback`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(feedback)
			});
			
			if (response.ok) {
				const result = await response.json();
				console.log(`✅ Inserted: ${feedback.source} - ${result.sentiment} - ${result.theme}`);
			} else {
				console.error(`❌ Failed to insert: ${feedback.source} - ${feedback.text}`);
			}
		} catch (error) {
			console.error(`❌ Error inserting feedback:`, error);
		}
		
		// Small delay to avoid overwhelming the worker
		await new Promise(resolve => setTimeout(resolve, 100));
	}
	
	console.log('🎉 Feedback seeding complete!');
}

// Run the seeding
seedFeedback().catch(console.error);
