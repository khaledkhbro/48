-- Create comprehensive dispute and reporting system
-- This handles job disputes, spam reports, and admin resolution workflow

-- Dispute types enum
CREATE TYPE dispute_type AS ENUM (
  'fake_work',
  'spam',
  'poor_quality',
  'not_delivered',
  'inappropriate_content',
  'other'
);

-- Dispute status enum
CREATE TYPE dispute_status AS ENUM (
  'pending',
  'under_review',
  'resolved_favor_poster',
  'resolved_favor_worker',
  'dismissed',
  'escalated'
);

-- Main disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dispute_type dispute_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[], -- Array of evidence file URLs
  status dispute_status DEFAULT 'pending',
  admin_notes TEXT,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  penalty_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispute messages for communication during resolution
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin_message BOOLEAN DEFAULT FALSE,
  attachments TEXT[], -- Array of attachment URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispute actions log for audit trail
CREATE TABLE IF NOT EXISTS dispute_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'status_change', 'refund_issued', 'user_suspended', etc.
  action_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suspended_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  suspension_type VARCHAR(50) NOT NULL, -- 'temporary', 'permanent', 'warning'
  suspended_until TIMESTAMP WITH TIME ZONE, -- NULL for permanent
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disputes_job_id ON disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reporter_id ON disputes(reporter_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reported_user_id ON disputes(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_actions_dispute_id ON dispute_actions(dispute_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_active ON user_suspensions(is_active) WHERE is_active = TRUE;

-- Add RLS policies
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- Disputes policies
CREATE POLICY "Users can view their own disputes" ON disputes
  FOR SELECT USING (
    auth.uid() = reporter_id OR 
    auth.uid() = reported_user_id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Users can create disputes" ON disputes
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Only admins can update disputes" ON disputes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Dispute messages policies
CREATE POLICY "Users can view messages in their disputes" ON dispute_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM disputes d 
      WHERE d.id = dispute_id 
      AND (d.reporter_id = auth.uid() OR d.reported_user_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Users can send messages in their disputes" ON dispute_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes d 
      WHERE d.id = dispute_id 
      AND (d.reporter_id = auth.uid() OR d.reported_user_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Dispute actions policies (admin only)
CREATE POLICY "Only admins can view dispute actions" ON dispute_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Only admins can create dispute actions" ON dispute_actions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- User suspensions policies
CREATE POLICY "Users can view their own suspensions" ON user_suspensions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Only admins can manage suspensions" ON user_suspensions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Function to check if user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_suspensions 
    WHERE user_id = user_uuid 
    AND is_active = TRUE 
    AND (suspended_until IS NULL OR suspended_until > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically resolve disputes after certain time
CREATE OR REPLACE FUNCTION auto_resolve_old_disputes()
RETURNS void AS $$
BEGIN
  -- Auto-dismiss disputes older than 30 days with no admin action
  UPDATE disputes 
  SET status = 'dismissed',
      resolution_notes = 'Auto-dismissed due to inactivity after 30 days',
      resolved_at = NOW()
  WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER disputes_updated_at_trigger
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_disputes_updated_at();

-- Insert some sample dispute categories for reference
INSERT INTO admin_settings (key, value, description) VALUES
('dispute_auto_resolve_days', '30', 'Number of days after which pending disputes are auto-dismissed'),
('dispute_evidence_max_files', '5', 'Maximum number of evidence files per dispute'),
('dispute_max_file_size_mb', '10', 'Maximum file size for dispute evidence in MB')
ON CONFLICT (key) DO NOTHING;
