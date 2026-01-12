-- Create feedback table for storing customer feedback
CREATE TABLE IF NOT EXISTS feedback (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	source TEXT NOT NULL,
	text TEXT NOT NULL,
	sentiment TEXT NOT NULL,
	theme TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries on created_at
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Create index for faster queries on theme
CREATE INDEX IF NOT EXISTS idx_feedback_theme ON feedback(theme);
