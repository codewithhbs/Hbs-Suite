-- v14: AI choice per calendar slot / post (text + image), e.g. "groq|cloudflare", "gemini|gemini", "hybrid|"
ALTER TABLE content_calendar ADD COLUMN ai_engine VARCHAR(40) NULL;
ALTER TABLE ai_tasks ADD COLUMN ai_engine VARCHAR(40) NULL;
