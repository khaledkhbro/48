-- Create user search behavior tracking system
-- This implements the personalized marketplace algorithm based on user search behavior

-- Create user search behavior table
CREATE TABLE IF NOT EXISTS user_search_behavior (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    search_query TEXT,
    search_type VARCHAR(50) NOT NULL, -- 'keyword', 'category', 'subcategory', 'micro_category'
    category_id INTEGER,
    subcategory_id INTEGER,
    micro_category_id INTEGER,
    results_count INTEGER DEFAULT 0,
    clicked_service_id INTEGER,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Create user interest profile table
CREATE TABLE IF NOT EXISTS user_interest_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    micro_category_interests JSONB DEFAULT '{}', -- {category_id: weight}
    subcategory_interests JSONB DEFAULT '{}',
    main_category_interests JSONB DEFAULT '{}',
    search_keywords JSONB DEFAULT '[]', -- Array of frequently searched keywords
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_interactions INTEGER DEFAULT 0,
    personalization_enabled BOOLEAN DEFAULT true
);

-- Create personalized marketplace algorithm settings table
CREATE TABLE IF NOT EXISTS personalized_algorithm_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default personalized algorithm settings
INSERT INTO personalized_algorithm_settings (setting_key, setting_value, description) VALUES
('personalization_weights', '{
    "micro_category": {"weight": 50, "enabled": true, "fallback": true},
    "sub_category": {"weight": 10, "enabled": true, "fallback": true},
    "main_category": {"weight": 10, "enabled": true, "fallback": true},
    "popular_bought": {"weight": 10, "enabled": true, "fallback": false},
    "most_viewed_trending": {"weight": 10, "enabled": true, "fallback": false}
}', 'Personalization algorithm weights based on user behavior'),

('behavior_tracking', '{
    "trackSearchQueries": true,
    "trackCategoryViews": true,
    "trackServiceClicks": true,
    "trackTimeSpent": true,
    "retentionDays": 30,
    "minInteractionsForPersonalization": 3,
    "enableRealTimePersonalization": true,
    "fallbackToGeneralWhenInsufficient": true
}', 'User behavior tracking configuration'),

('fallback_algorithm', '{
    "newUserAlgorithm": "newest_first",
    "insufficientDataAlgorithm": "popular_first",
    "enableCategoryFallback": true,
    "enableSubcategoryFallback": true,
    "enableMicroCategoryFallback": true
}', 'Fallback algorithms when personalization data is insufficient');

-- Create function to update user interest profile
CREATE OR REPLACE FUNCTION update_user_interest_profile(
    p_user_id INTEGER,
    p_category_type VARCHAR(50),
    p_category_id INTEGER,
    p_weight_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
    -- Insert or update user interest profile
    INSERT INTO user_interest_profiles (user_id, total_interactions)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_interactions = user_interest_profiles.total_interactions + 1,
        last_updated = CURRENT_TIMESTAMP;

    -- Update specific category interest
    IF p_category_type = 'micro_category' THEN
        UPDATE user_interest_profiles 
        SET micro_category_interests = COALESCE(micro_category_interests, '{}'::jsonb) || 
            jsonb_build_object(p_category_id::text, 
                COALESCE((micro_category_interests->>p_category_id::text)::integer, 0) + p_weight_increment
            )
        WHERE user_id = p_user_id;
    ELSIF p_category_type = 'subcategory' THEN
        UPDATE user_interest_profiles 
        SET subcategory_interests = COALESCE(subcategory_interests, '{}'::jsonb) || 
            jsonb_build_object(p_category_id::text, 
                COALESCE((subcategory_interests->>p_category_id::text)::integer, 0) + p_weight_increment
            )
        WHERE user_id = p_user_id;
    ELSIF p_category_type = 'main_category' THEN
        UPDATE user_interest_profiles 
        SET main_category_interests = COALESCE(main_category_interests, '{}'::jsonb) || 
            jsonb_build_object(p_category_id::text, 
                COALESCE((main_category_interests->>p_category_id::text)::integer, 0) + p_weight_increment
            )
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get personalized services for user
CREATE OR REPLACE FUNCTION get_personalized_services(
    p_user_id INTEGER,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    service_id INTEGER,
    personalization_score DECIMAL,
    reason TEXT
) AS $$
DECLARE
    user_profile RECORD;
    settings RECORD;
    min_interactions INTEGER;
BEGIN
    -- Get user profile and settings
    SELECT * INTO user_profile FROM user_interest_profiles WHERE user_id = p_user_id;
    SELECT setting_value INTO settings FROM personalized_algorithm_settings WHERE setting_key = 'behavior_tracking';
    
    min_interactions := COALESCE((settings.setting_value->>'minInteractionsForPersonalization')::integer, 3);
    
    -- Check if user has enough interactions for personalization
    IF user_profile IS NULL OR user_profile.total_interactions < min_interactions THEN
        -- Return general popular services for new users
        RETURN QUERY
        SELECT 
            ms.id::INTEGER,
            0.0::DECIMAL,
            'New user - showing popular services'::TEXT
        FROM marketplace_services ms
        ORDER BY ms.view_count DESC, ms.order_count DESC
        LIMIT p_limit OFFSET p_offset;
        RETURN;
    END IF;
    
    -- Return personalized services based on user interests
    RETURN QUERY
    WITH personalized_scores AS (
        SELECT 
            ms.id,
            -- Micro category score (50% weight)
            CASE 
                WHEN user_profile.micro_category_interests ? ms.micro_category_id::text 
                THEN (user_profile.micro_category_interests->>ms.micro_category_id::text)::integer * 0.5
                ELSE 0
            END +
            -- Subcategory score (10% weight)  
            CASE 
                WHEN user_profile.subcategory_interests ? ms.subcategory_id::text
                THEN (user_profile.subcategory_interests->>ms.subcategory_id::text)::integer * 0.1
                ELSE 0
            END +
            -- Main category score (10% weight)
            CASE 
                WHEN user_profile.main_category_interests ? ms.category_id::text
                THEN (user_profile.main_category_interests->>ms.category_id::text)::integer * 0.1
                ELSE 0
            END +
            -- Popular/trending score (20% weight)
            (ms.order_count * 0.1 + ms.view_count * 0.1) / 100 AS personalization_score,
            
            CASE 
                WHEN user_profile.micro_category_interests ? ms.micro_category_id::text 
                THEN 'Based on your micro category interests'
                WHEN user_profile.subcategory_interests ? ms.subcategory_id::text
                THEN 'Based on your subcategory interests'  
                WHEN user_profile.main_category_interests ? ms.category_id::text
                THEN 'Based on your category interests'
                ELSE 'Popular service'
            END AS reason
        FROM marketplace_services ms
        WHERE ms.is_active = true
    )
    SELECT 
        ps.id::INTEGER,
        ps.personalization_score::DECIMAL,
        ps.reason::TEXT
    FROM personalized_scores ps
    ORDER BY ps.personalization_score DESC, random()
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_search_behavior_user_id ON user_search_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_behavior_search_type ON user_search_behavior(search_type);
CREATE INDEX IF NOT EXISTS idx_user_search_behavior_created_at ON user_search_behavior(created_at);
CREATE INDEX IF NOT EXISTS idx_user_search_behavior_category_ids ON user_search_behavior(category_id, subcategory_id, micro_category_id);

CREATE INDEX IF NOT EXISTS idx_user_interest_profiles_user_id ON user_interest_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interest_profiles_last_updated ON user_interest_profiles(last_updated);

-- Create trigger to automatically update interest profiles when search behavior is recorded
CREATE OR REPLACE FUNCTION trigger_update_interest_profile() RETURNS TRIGGER AS $$
BEGIN
    -- Update micro category interest
    IF NEW.micro_category_id IS NOT NULL THEN
        PERFORM update_user_interest_profile(NEW.user_id, 'micro_category', NEW.micro_category_id, 3);
    END IF;
    
    -- Update subcategory interest  
    IF NEW.subcategory_id IS NOT NULL THEN
        PERFORM update_user_interest_profile(NEW.user_id, 'subcategory', NEW.subcategory_id, 2);
    END IF;
    
    -- Update main category interest
    IF NEW.category_id IS NOT NULL THEN
        PERFORM update_user_interest_profile(NEW.user_id, 'main_category', NEW.category_id, 1);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interest_profile_trigger
    AFTER INSERT ON user_search_behavior
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_interest_profile();

-- Create cleanup function to remove old search behavior data
CREATE OR REPLACE FUNCTION cleanup_old_search_behavior() RETURNS VOID AS $$
DECLARE
    retention_days INTEGER;
BEGIN
    -- Get retention days from settings
    SELECT (setting_value->>'retentionDays')::integer INTO retention_days 
    FROM personalized_algorithm_settings 
    WHERE setting_key = 'behavior_tracking';
    
    retention_days := COALESCE(retention_days, 30);
    
    -- Delete old search behavior data
    DELETE FROM user_search_behavior 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    
    -- Update interest profiles to remove stale data
    UPDATE user_interest_profiles 
    SET last_updated = CURRENT_TIMESTAMP
    WHERE last_updated < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
END;
$$ LANGUAGE plpgsql;
