-- Service Provider Applications Table
-- This table stores applications from users who want to become verified service providers

CREATE TABLE IF NOT EXISTS service_provider_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic Information
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- Skills and Experience
    skills TEXT[] NOT NULL, -- Array of skills
    experience_years INTEGER NOT NULL,
    education TEXT,
    certifications TEXT[],
    
    -- Portfolio and Work Proof
    portfolio_links TEXT[],
    work_samples TEXT[], -- URLs to work samples
    
    -- External Platform Verification (for faster approval)
    fiverr_profile VARCHAR(500),
    upwork_profile VARCHAR(500),
    peopleperhour_profile VARCHAR(500),
    legiit_profile VARCHAR(500),
    other_platforms JSONB,
    
    -- Categories they want to provide services in
    requested_categories UUID[] NOT NULL, -- References categories(id)
    
    -- Application Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'needs_more_info')),
    
    -- Admin Review
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional Information Request
    additional_info_requested TEXT,
    additional_info_provided TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_provider_applications_user_id ON service_provider_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_service_provider_applications_status ON service_provider_applications(status);
CREATE INDEX IF NOT EXISTS idx_service_provider_applications_created_at ON service_provider_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_service_provider_applications_reviewed_by ON service_provider_applications(reviewed_by);

-- Add a column to users table to track if they are approved service providers
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_service_provider BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_provider_approved_at TIMESTAMP WITH TIME ZONE;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_service_provider_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_provider_applications_updated_at
    BEFORE UPDATE ON service_provider_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_service_provider_applications_updated_at();
