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
		let sentiment = 'neutral';
		let theme = 'general';
		try {
			const aiResult = JSON.parse(aiResponse.response);
			sentiment = aiResult.sentiment || 'neutral';
			theme = aiResult.theme || 'general';
		} catch (e) {
			// Fallback if AI response parsing fails
			console.error('AI response parsing failed:', e);
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
		return new Response(
			JSON.stringify({ error: 'Internal server error' }), 
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
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

		// Calculate scores for each theme
		const scoredThemes = Array.from(themeGroups.entries()).map(([theme, feedbacks]) => {
			const score = calculateEscalationScore(feedbacks);
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
				}))
			};
		});

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
