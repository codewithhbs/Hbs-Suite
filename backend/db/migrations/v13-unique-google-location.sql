-- v13: one client per Google listing per workspace (blocks duplicate imports from
-- double-clicks / parallel connects). NULL (not linked yet) is allowed many times.
-- If this fails with "Duplicate entry", run: npm run fix:duplicates -- --apply  and migrate again.
CREATE UNIQUE INDEX uq_client_tenant_location ON clients (tenant_id, google_location_name);
