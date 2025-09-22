-- Creating missing chat automation tables
-- Create chat automation settings table
CREATE TABLE IF NOT EXISTS public.chat_automation_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create automated message templates table
CREATE TABLE IF NOT EXISTS public.automated_message_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- 'welcome', 'idle', 'followup', etc.
    delay_seconds INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default automation settings
INSERT INTO public.chat_automation_settings (setting_key, setting_value, description) VALUES
('welcome_message_enabled', 'true', 'Enable welcome message when chat starts'),
('idle_message_enabled', 'true', 'Enable idle message after period of inactivity'),
('idle_message_delay', '300', 'Delay in seconds before sending idle message'),
('followup_message_enabled', 'true', 'Enable followup message'),
('followup_message_delay', '600', 'Delay in seconds before sending followup message'),
('max_automated_messages', '3', 'Maximum number of automated messages per session')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default message templates
INSERT INTO public.automated_message_templates (template_name, content, trigger_type, delay_seconds) VALUES
('welcome_message', 'Hello! Welcome to our support chat. How can I help you today?', 'welcome', 0),
('idle_message', 'Are you still there? I''m here to help if you have any questions.', 'idle', 300),
('followup_message', 'Is there anything else I can help you with today?', 'followup', 600),
('agent_available', 'A support agent will be with you shortly. Please describe your issue and we''ll assist you as soon as possible.', 'agent_available', 30)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_automation_settings_key ON public.chat_automation_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_automated_message_templates_trigger ON public.automated_message_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automated_message_templates_active ON public.automated_message_templates(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE public.chat_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_message_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin can manage chat automation settings" ON public.chat_automation_settings
    FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin');

CREATE POLICY "Admin can manage message templates" ON public.automated_message_templates
    FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin');

-- Allow agents to read settings and templates
CREATE POLICY "Agents can read chat automation settings" ON public.chat_automation_settings
    FOR SELECT USING (auth.jwt() ->> 'user_type' IN ('admin', 'agent'));

CREATE POLICY "Agents can read message templates" ON public.automated_message_templates
    FOR SELECT USING (auth.jwt() ->> 'user_type' IN ('admin', 'agent'));
