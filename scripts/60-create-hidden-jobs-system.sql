-- Create hidden_jobs table for users to hide jobs they don't want to see
CREATE TABLE IF NOT EXISTS hidden_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  hidden_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT, -- Optional reason for hiding (spam, not interested, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only hide a job once
  UNIQUE(user_id, job_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hidden_jobs_user_id ON hidden_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_jobs_job_id ON hidden_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_hidden_jobs_hidden_at ON hidden_jobs(hidden_at);

-- Add RLS policies
ALTER TABLE hidden_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own hidden jobs
CREATE POLICY "Users can view own hidden jobs" ON hidden_jobs
  FOR SELECT USING (user_id = auth.uid());

-- Users can only hide jobs for themselves
CREATE POLICY "Users can hide jobs for themselves" ON hidden_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only unhide their own hidden jobs
CREATE POLICY "Users can unhide own jobs" ON hidden_jobs
  FOR DELETE USING (user_id = auth.uid());

-- Users can update their own hidden job reasons
CREATE POLICY "Users can update own hidden jobs" ON hidden_jobs
  FOR UPDATE USING (user_id = auth.uid());
