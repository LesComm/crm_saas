-- 009: Dev seed data (development only)
-- Creates a default tenant and super_admin user for local dev

INSERT INTO tenants (name, slug, plan, max_users, max_conversations_per_month)
VALUES ('Les Communicateurs', 'les-communicateurs', 'pro', 10, 1000)
ON CONFLICT (slug) DO NOTHING;
