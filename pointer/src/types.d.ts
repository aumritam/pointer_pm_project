import { D1Database } from "@cloudflare/workers-types";

export interface Env {
	// D1 database binding
	pointer_db: D1Database;
	// Workers AI binding
	ai: any;
}

export interface Feedback {
	source: string;
	text: string;
	sentiment: string;
	theme: string;
	created_at: string;
}
