-- 010: Add MySQL direct mode to CRM credentials
-- Allows tenants to connect via MySQL instead of Perfex REST API

ALTER TABLE crm_credentials
  ADD COLUMN connection_mode VARCHAR(20) NOT NULL DEFAULT 'api',
  ADD COLUMN mysql_host VARCHAR(500),
  ADD COLUMN mysql_port INT DEFAULT 3306,
  ADD COLUMN mysql_user VARCHAR(200),
  ADD COLUMN mysql_password_encrypted BYTEA,
  ADD COLUMN mysql_password_iv BYTEA,
  ADD COLUMN mysql_password_tag BYTEA,
  ADD COLUMN mysql_database VARCHAR(200);

-- Make API-specific columns nullable (not needed for MySQL mode)
ALTER TABLE crm_credentials
  ALTER COLUMN base_url DROP NOT NULL,
  ALTER COLUMN api_token_encrypted DROP NOT NULL,
  ALTER COLUMN api_token_iv DROP NOT NULL,
  ALTER COLUMN api_token_tag DROP NOT NULL;
