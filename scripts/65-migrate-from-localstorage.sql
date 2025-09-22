-- Migration script to replace localStorage with PostgreSQL tables
-- This creates all necessary tables to replace localStorage functionality

-- Services and marketplace data
CREATE TABLE IF NOT EXISTS marketplace_services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job applications
CREATE TABLE IF NOT EXISTS marketplace_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
  cover_letter TEXT,
  proposed_price DECIMAL(10,2),
  estimated_duration TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
);

-- Work proofs
CREATE TABLE IF NOT EXISTS marketplace_work_proofs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  proof_type TEXT CHECK (proof_type IN ('image', 'document', 'link', 'text')) NOT NULL,
  proof_content TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')) DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_feedback TEXT
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  chat_id TEXT,
  ticket_type TEXT CHECK (ticket_type IN ('free', 'priority')) DEFAULT 'free',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  assigned_admin_id TEXT,
  assigned_admin_name TEXT,
  payment_amount DECIMAL(10,2) DEFAULT 0,
  payment_transaction_id TEXT,
  response_time_hours INTEGER DEFAULT 48,
  unread_messages INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Chat files
CREATE TABLE IF NOT EXISTS chat_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_text_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  is_expired BOOLEAN DEFAULT FALSE
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE,
  preferred_currency TEXT DEFAULT 'USD',
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Screenshot pricing tiers (replacing localStorage)
CREATE TABLE IF NOT EXISTS screenshot_pricing_tiers_local (
  id SERIAL PRIMARY KEY,
  screenshot_number INTEGER NOT NULL UNIQUE,
  percentage_fee DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Screenshot pricing settings (replacing localStorage)
CREATE TABLE IF NOT EXISTS screenshot_pricing_settings_local (
  id SERIAL PRIMARY KEY,
  setting_name TEXT NOT NULL UNIQUE,
  setting_value DECIMAL(10,2) NOT NULL,
  setting_type TEXT DEFAULT 'number',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin revision settings (replacing localStorage)
CREATE TABLE IF NOT EXISTS admin_revision_settings_local (
  id SERIAL PRIMARY KEY,
  max_revision_requests INTEGER DEFAULT 2,
  revision_request_timeout_value INTEGER DEFAULT 24,
  revision_request_timeout_unit TEXT DEFAULT 'hours',
  rejection_response_timeout_value INTEGER DEFAULT 1,
  rejection_response_timeout_unit TEXT DEFAULT 'minutes',
  enable_automatic_refunds BOOLEAN DEFAULT TRUE,
  refund_on_revision_timeout BOOLEAN DEFAULT TRUE,
  refund_on_rejection_timeout BOOLEAN DEFAULT TRUE,
  enable_revision_warnings BOOLEAN DEFAULT TRUE,
  revision_penalty_enabled BOOLEAN DEFAULT FALSE,
  revision_penalty_amount DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seller profiles (replacing localStorage)
CREATE TABLE IF NOT EXISTS seller_profiles_local (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  bio TEXT,
  location TEXT,
  country TEXT,
  languages TEXT[], -- Array of languages
  timezone TEXT DEFAULT 'UTC',
  seller_type TEXT CHECK (seller_type IN ('Individual', 'Business')) DEFAULT 'Individual',
  is_verified BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Statistics
  completed_orders INTEGER DEFAULT 0,
  on_time_delivery_rate DECIMAL(5,2) DEFAULT 100,
  average_response_time TEXT DEFAULT '2 hours',
  last_delivery TEXT DEFAULT 'about 6 hours',
  total_earnings DECIMAL(12,2) DEFAULT 0,
  
  -- Professional Info
  seller_level INTEGER DEFAULT 1,
  seller_badge TEXT DEFAULT 'New Seller',
  skills TEXT[],
  certifications TEXT[],
  
  -- Contact & Availability
  available_for_consultation BOOLEAN DEFAULT TRUE,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '17:00',
  working_hours_timezone TEXT DEFAULT 'UTC',
  
  -- Profile customization
  profile_image TEXT,
  cover_image TEXT,
  
  -- Reviews & Ratings
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_reviews INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio items for seller profiles
CREATE TABLE IF NOT EXISTS seller_portfolio_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  seller_id TEXT NOT NULL REFERENCES seller_profiles_local(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth state management (replacing localStorage)
CREATE TABLE IF NOT EXISTS oauth_states (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider TEXT NOT NULL,
  state_value TEXT NOT NULL,
  user_session TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default screenshot pricing tiers
INSERT INTO screenshot_pricing_tiers_local (screenshot_number, percentage_fee, is_free, is_active) VALUES
(1, 0, TRUE, TRUE),
(2, 3, FALSE, TRUE),
(3, 3, FALSE, TRUE),
(4, 5, FALSE, TRUE),
(5, 5, FALSE, TRUE)
ON CONFLICT (screenshot_number) DO NOTHING;

-- Insert default screenshot pricing settings
INSERT INTO screenshot_pricing_settings_local (setting_name, setting_value, description) VALUES
('max_screenshots_allowed', 5, 'Maximum number of screenshots allowed per job'),
('default_screenshot_fee', 0.05, 'Default fee per screenshot when percentage pricing is disabled'),
('enable_percentage_pricing', 1, 'Enable percentage-based pricing (1 = enabled, 0 = disabled)'),
('platform_screenshot_fee', 0, 'Platform fee for screenshots')
ON CONFLICT (setting_name) DO NOTHING;

-- Insert default admin revision settings
INSERT INTO admin_revision_settings_local (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_services_user_id ON marketplace_services(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_services_category ON marketplace_services(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_services_status ON marketplace_services(status);

CREATE INDEX IF NOT EXISTS idx_marketplace_applications_job_id ON marketplace_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_worker_id ON marketplace_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_status ON marketplace_applications(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_type ON support_tickets(ticket_type);

CREATE INDEX IF NOT EXISTS idx_chat_files_chat_id ON chat_files(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_expires_at ON chat_files(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_states_provider ON oauth_states(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Enable Row Level Security (RLS) for data protection
ALTER TABLE marketplace_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_work_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_portfolio_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - can be customized based on auth system)
-- For now, allowing all operations since auth is being skipped

CREATE POLICY "Allow all operations on marketplace_services" ON marketplace_services FOR ALL USING (true);
CREATE POLICY "Allow all operations on marketplace_applications" ON marketplace_applications FOR ALL USING (true);
CREATE POLICY "Allow all operations on marketplace_work_proofs" ON marketplace_work_proofs FOR ALL USING (true);
CREATE POLICY "Allow all operations on support_tickets" ON support_tickets FOR ALL USING (true);
CREATE POLICY "Allow all operations on chat_files" ON chat_files FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_preferences" ON user_preferences FOR ALL USING (true);
CREATE POLICY "Allow all operations on seller_profiles_local" ON seller_profiles_local FOR ALL USING (true);
CREATE POLICY "Allow all operations on seller_portfolio_items" ON seller_portfolio_items FOR ALL USING (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_marketplace_services_updated_at BEFORE UPDATE ON marketplace_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_applications_updated_at BEFORE UPDATE ON marketplace_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seller_profiles_updated_at BEFORE UPDATE ON seller_profiles_local FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_screenshot_pricing_tiers_updated_at BEFORE UPDATE ON screenshot_pricing_tiers_local FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
