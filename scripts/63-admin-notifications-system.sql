-- Admin Notifications System
-- Allows admins to send notifications to users from admin panel

-- Create admin_notifications table to track notifications sent by admins
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'system', -- system, announcement, warning, promotion
  priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  target_type VARCHAR(20) NOT NULL DEFAULT 'all', -- all, specific, role, active
  target_users TEXT[], -- Array of user IDs for specific targeting
  target_criteria JSONB, -- Additional targeting criteria
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sending, sent, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_recipients table to track individual deliveries
CREATE TABLE IF NOT EXISTS notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_notification_id UUID NOT NULL REFERENCES admin_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'delivered', -- delivered, failed, read
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_templates table for reusable templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'system',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_scheduled_for ON admin_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_delivery_status ON admin_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_admin_notification_id ON notification_recipients(admin_notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_id ON notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_created_by ON notification_templates(created_by);

-- Insert some default notification templates
INSERT INTO notification_templates (name, title, message, notification_type, priority, created_by) VALUES
('welcome_message', 'Welcome to Our Platform!', 'Thank you for joining our marketplace. We''re excited to have you on board!', 'system', 'normal', (SELECT id FROM auth.users WHERE email = 'admin@marketplace.com' LIMIT 1)),
('maintenance_notice', 'Scheduled Maintenance', 'We will be performing scheduled maintenance on [DATE]. The platform may be temporarily unavailable.', 'announcement', 'high', (SELECT id FROM auth.users WHERE email = 'admin@marketplace.com' LIMIT 1)),
('policy_update', 'Policy Update', 'We have updated our terms of service and privacy policy. Please review the changes.', 'announcement', 'normal', (SELECT id FROM auth.users WHERE email = 'admin@marketplace.com' LIMIT 1)),
('security_alert', 'Security Alert', 'We detected unusual activity on your account. Please review your recent activity and update your password if necessary.', 'warning', 'urgent', (SELECT id FROM auth.users WHERE email = 'admin@marketplace.com' LIMIT 1)),
('promotion_offer', 'Special Offer!', 'Limited time offer: Get 20% off on all services. Use code SAVE20 at checkout.', 'promotion', 'normal', (SELECT id FROM auth.users WHERE email = 'admin@marketplace.com' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Create function to get user statistics for targeting
CREATE OR REPLACE FUNCTION get_user_targeting_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  job_posters BIGINT,
  workers BIGINT,
  verified_users BIGINT,
  new_users_30d BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) as total_users,
    (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL AND last_sign_in_at > NOW() - INTERVAL '30 days') as active_users,
    (SELECT COUNT(DISTINCT user_id) FROM jobs WHERE deleted_at IS NULL) as job_posters,
    (SELECT COUNT(DISTINCT user_id) FROM job_applications WHERE deleted_at IS NULL) as workers,
    (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL AND email_confirmed_at IS NOT NULL) as verified_users,
    (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '30 days') as new_users_30d;
END;
$$ LANGUAGE plpgsql;

-- Create function to send notification to users
CREATE OR REPLACE FUNCTION send_admin_notification(
  p_admin_id UUID,
  p_title VARCHAR(255),
  p_message TEXT,
  p_notification_type VARCHAR(50) DEFAULT 'system',
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_target_type VARCHAR(20) DEFAULT 'all',
  p_target_users TEXT[] DEFAULT NULL,
  p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  target_user_ids UUID[];
  user_id UUID;
  recipient_count INTEGER := 0;
BEGIN
  -- Create the admin notification record
  INSERT INTO admin_notifications (
    admin_id, title, message, notification_type, priority, 
    target_type, target_users, scheduled_for
  ) VALUES (
    p_admin_id, p_title, p_message, p_notification_type, p_priority,
    p_target_type, p_target_users, p_scheduled_for
  ) RETURNING id INTO notification_id;

  -- Determine target users based on target_type
  IF p_target_type = 'all' THEN
    SELECT ARRAY_AGG(id) INTO target_user_ids 
    FROM auth.users 
    WHERE deleted_at IS NULL;
  ELSIF p_target_type = 'active' THEN
    SELECT ARRAY_AGG(id) INTO target_user_ids 
    FROM auth.users 
    WHERE deleted_at IS NULL 
    AND last_sign_in_at > NOW() - INTERVAL '30 days';
  ELSIF p_target_type = 'specific' AND p_target_users IS NOT NULL THEN
    target_user_ids := p_target_users::UUID[];
  ELSE
    target_user_ids := ARRAY[]::UUID[];
  END IF;

  -- Create notification recipients
  FOREACH user_id IN ARRAY target_user_ids
  LOOP
    INSERT INTO notification_recipients (admin_notification_id, user_id)
    VALUES (notification_id, user_id);
    recipient_count := recipient_count + 1;
  END LOOP;

  -- Update the notification with recipient count and status
  UPDATE admin_notifications 
  SET total_recipients = recipient_count,
      delivery_status = 'sent',
      sent_at = NOW()
  WHERE id = notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE admin_notifications IS 'Stores notifications sent by admins to users';
COMMENT ON TABLE notification_recipients IS 'Tracks individual notification deliveries to users';
COMMENT ON TABLE notification_templates IS 'Reusable notification templates for admins';
