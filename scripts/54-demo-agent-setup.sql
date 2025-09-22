-- Demo Agent Setup for Customer Support
-- This script creates demo agents and sample chat sessions for testing

-- Insert demo agents
INSERT INTO users (
  id, email, password_hash, first_name, last_name, user_type, 
  status, created_at, updated_at, email_verified, phone_verified,
  max_concurrent_chats, current_chat_count, agent_status
) VALUES 
(
  'agent-demo-1',
  'agent1@marketplace.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: agent123
  'Sarah',
  'Johnson',
  'agent',
  'active',
  NOW(),
  NOW(),
  true,
  true,
  5,
  0,
  'available'
),
(
  'agent-demo-2',
  'agent2@marketplace.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: agent123
  'Mike',
  'Chen',
  'agent',
  'active',
  NOW(),
  NOW(),
  true,
  true,
  5,
  1,
  'busy'
),
(
  'agent-demo-3',
  'agent3@marketplace.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: agent123
  'Emma',
  'Rodriguez',
  'agent',
  'active',
  NOW(),
  NOW(),
  true,
  true,
  3,
  0,
  'available'
) ON CONFLICT (email) DO UPDATE SET
  user_type = EXCLUDED.user_type,
  max_concurrent_chats = EXCLUDED.max_concurrent_chats,
  agent_status = EXCLUDED.agent_status;

-- Create sample anonymous chat sessions
INSERT INTO anonymous_chat_sessions (
  session_id, status, created_at, last_activity, assigned_agent_id
) VALUES 
(
  'demo-session-001',
  'active',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '2 minutes',
  'agent-demo-1'
),
(
  'demo-session-002',
  'active',
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '1 minute',
  'agent-demo-2'
),
(
  'demo-session-003',
  'waiting',
  NOW() - INTERVAL '3 minutes',
  NOW() - INTERVAL '30 seconds',
  NULL
) ON CONFLICT (session_id) DO UPDATE SET
  status = EXCLUDED.status,
  last_activity = EXCLUDED.last_activity;

-- Create sample messages for demo sessions
INSERT INTO anonymous_messages (
  id, session_id, content, sender_type, timestamp, agent_id
) VALUES 
-- Session 1 messages
(
  'msg-demo-001',
  'demo-session-001',
  'Hi! I need help with placing an order on your platform.',
  'user',
  NOW() - INTERVAL '10 minutes',
  NULL
),
(
  'msg-demo-002',
  'demo-session-001',
  'Hello! I''d be happy to help you with placing an order. What specific assistance do you need?',
  'agent',
  NOW() - INTERVAL '9 minutes',
  'agent-demo-1'
),
(
  'msg-demo-003',
  'demo-session-001',
  'I''m looking for a logo design service but I''m not sure how to filter the results.',
  'user',
  NOW() - INTERVAL '8 minutes',
  NULL
),
(
  'msg-demo-004',
  'demo-session-001',
  'Great! You can use our category filters on the left side. Go to "Design & Creative" then select "Logo Design". You can also filter by price range and delivery time.',
  'agent',
  NOW() - INTERVAL '7 minutes',
  'agent-demo-1'
),
(
  'msg-demo-005',
  'demo-session-001',
  'Perfect! That helped a lot. How do I know if a seller is reliable?',
  'user',
  NOW() - INTERVAL '2 minutes',
  NULL
),

-- Session 2 messages
(
  'msg-demo-006',
  'demo-session-002',
  'I have a question about payment methods. Do you accept PayPal?',
  'user',
  NOW() - INTERVAL '5 minutes',
  NULL
),
(
  'msg-demo-007',
  'demo-session-002',
  'Yes, we accept multiple payment methods including PayPal, credit cards, and bank transfers. You can see all available options during checkout.',
  'agent',
  NOW() - INTERVAL '4 minutes',
  'agent-demo-2'
),
(
  'msg-demo-008',
  'demo-session-002',
  'Excellent! Is there buyer protection if something goes wrong?',
  'user',
  NOW() - INTERVAL '1 minute',
  NULL
),

-- Session 3 messages (waiting for agent)
(
  'msg-demo-009',
  'demo-session-003',
  'Hello, I need help with my account settings.',
  'user',
  NOW() - INTERVAL '3 minutes',
  NULL
),
(
  'msg-demo-010',
  'demo-session-003',
  'Is anyone there? I really need assistance.',
  'user',
  NOW() - INTERVAL '30 seconds',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  timestamp = EXCLUDED.timestamp;

-- Update agent chat counts
UPDATE users SET current_chat_count = 1 WHERE id = 'agent-demo-1';
UPDATE users SET current_chat_count = 1 WHERE id = 'agent-demo-2';
UPDATE users SET current_chat_count = 0 WHERE id = 'agent-demo-3';

-- Create agent performance stats
INSERT INTO agent_performance_stats (
  agent_id, date, messages_sent, sessions_handled, avg_response_time_seconds,
  customer_satisfaction_score, created_at
) VALUES 
(
  'agent-demo-1',
  CURRENT_DATE,
  47,
  12,
  138, -- 2.3 minutes
  4.8,
  NOW()
),
(
  'agent-demo-2',
  CURRENT_DATE,
  32,
  8,
  165, -- 2.75 minutes
  4.6,
  NOW()
),
(
  'agent-demo-3',
  CURRENT_DATE,
  28,
  7,
  142, -- 2.37 minutes
  4.9,
  NOW()
) ON CONFLICT (agent_id, date) DO UPDATE SET
  messages_sent = EXCLUDED.messages_sent,
  sessions_handled = EXCLUDED.sessions_handled,
  avg_response_time_seconds = EXCLUDED.avg_response_time_seconds,
  customer_satisfaction_score = EXCLUDED.customer_satisfaction_score;
