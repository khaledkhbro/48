-- Add admin setting for service provider approval requirement
-- This allows admins to toggle whether users need approval to become service providers

-- Add the setting to admin_settings table (create if doesn't exist)
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) NOT NULL DEFAULT 'string', -- 'string', 'boolean', 'number', 'json'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the service provider approval requirement setting
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description)
VALUES (
    'require_service_provider_approval',
    'true',
    'boolean',
    'When enabled, users must apply and get approved before they can create services. When disabled, anyone can create services immediately.'
) ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_settings_updated_at();
