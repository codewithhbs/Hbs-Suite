-- v12: indexes for the paginated, tenant-scoped list screens (React/Express split).
-- Safe to re-run: scripts/migrate.js skips "duplicate key name" errors.
CREATE INDEX idx_task_tenant_status   ON ai_tasks (tenant_id, status);
CREATE INDEX idx_task_tenant_updated  ON ai_tasks (tenant_id, updated_at);
CREATE INDEX idx_task_tenant_created  ON ai_tasks (tenant_id, created_at);
CREATE INDEX idx_task_client_id       ON ai_tasks (client_id, id);
CREATE INDEX idx_exec_tenant_id       ON ai_executions (tenant_id, id);
CREATE INDEX idx_exec_tenant_agent    ON ai_executions (tenant_id, agent, status);
CREATE INDEX idx_exec_client          ON ai_executions (client_id);
CREATE INDEX idx_kw_tenant_client_rel ON keywords (tenant_id, client_id, relevance_score);
CREATE INDEX idx_client_tenant_name   ON clients (tenant_id, business_name);
CREATE INDEX idx_client_tenant_active ON clients (tenant_id, active);
CREATE INDEX idx_post_task            ON gmb_posts (task_id);
CREATE INDEX idx_profile_client       ON gmb_profiles (client_id);
CREATE INDEX idx_cal_tenant_date      ON content_calendar (tenant_id, scheduled_date);
CREATE INDEX idx_inv_status           ON invoices (status);
