-- User Login Tracking System for IP Monitoring
-- Track user logins with IP addresses to detect multiple accounts from same IP

-- Create user login tracking table
CREATE TABLE IF NOT EXISTS user_login_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    ip_address INET NOT NULL,
    location_data JSONB, -- Store location information from IP
    user_agent TEXT,
    login_method VARCHAR(50) DEFAULT 'password', -- 'password', 'oauth', etc.
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_ip_address ON user_login_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_created_at ON user_login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_ip_user ON user_login_logs(ip_address, user_id);

-- Create view for IP monitoring - shows IPs with multiple users
CREATE OR REPLACE VIEW suspicious_ip_addresses AS
SELECT 
    ip_address,
    COUNT(DISTINCT user_id) as user_count,
    ARRAY_AGG(DISTINCT user_id) as user_ids,
    MIN(created_at) as first_login,
    MAX(created_at) as last_login,
    COUNT(*) as total_logins
FROM user_login_logs 
WHERE success = true
GROUP BY ip_address
HAVING COUNT(DISTINCT user_id) > 1
ORDER BY user_count DESC, total_logins DESC;

-- Create function to get detailed IP analysis
CREATE OR REPLACE FUNCTION get_ip_user_details(target_ip INET)
RETURNS TABLE (
    user_id INTEGER,
    username VARCHAR,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    user_type VARCHAR,
    login_count BIGINT,
    first_login TIMESTAMP,
    last_login TIMESTAMP,
    location_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.user_type,
        COUNT(ull.id) as login_count,
        MIN(ull.created_at) as first_login,
        MAX(ull.created_at) as last_login,
        ull.location_data
    FROM users u
    JOIN user_login_logs ull ON u.id = ull.user_id
    WHERE ull.ip_address = target_ip AND ull.success = true
    GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.user_type, ull.location_data
    ORDER BY login_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to log user login
CREATE OR REPLACE FUNCTION log_user_login(
    p_user_id INTEGER,
    p_ip_address INET,
    p_location_data JSONB DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_login_method VARCHAR(50) DEFAULT 'password',
    p_success BOOLEAN DEFAULT true
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_login_logs (
        user_id, 
        ip_address, 
        location_data, 
        user_agent, 
        login_method, 
        success
    ) VALUES (
        p_user_id, 
        p_ip_address, 
        p_location_data, 
        p_user_agent, 
        p_login_method, 
        p_success
    );
END;
$$ LANGUAGE plpgsql;

-- Create cleanup function for old login logs
CREATE OR REPLACE FUNCTION cleanup_old_login_logs() RETURNS VOID AS $$
BEGIN
    -- Keep login logs for 90 days
    DELETE FROM user_login_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
