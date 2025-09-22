-- Create marketplace reviews system with PostgreSQL
-- This handles reviews between buyers and sellers after order completion

-- Create marketplace_reviews table
CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    reviewer_id VARCHAR(255) NOT NULL,
    reviewee_id VARCHAR(255) NOT NULL,
    reviewer_type VARCHAR(20) NOT NULL CHECK (reviewer_type IN ('buyer', 'seller')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    delivery_time_rating INTEGER CHECK (delivery_time_rating >= 1 AND delivery_time_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(order_id, reviewer_id) -- One review per person per order
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_order_id ON marketplace_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_reviewer_id ON marketplace_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_reviewee_id ON marketplace_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_created_at ON marketplace_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_rating ON marketplace_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_active ON marketplace_reviews(is_deleted) WHERE is_deleted = FALSE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketplace_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_marketplace_reviews_updated_at ON marketplace_reviews;
CREATE TRIGGER trigger_marketplace_reviews_updated_at
    BEFORE UPDATE ON marketplace_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_marketplace_reviews_updated_at();

-- Create view for review statistics
CREATE OR REPLACE VIEW marketplace_review_stats AS
SELECT 
    reviewee_id,
    reviewer_type,
    COUNT(*) as total_reviews,
    AVG(rating)::DECIMAL(3,2) as avg_rating,
    AVG(communication_rating)::DECIMAL(3,2) as avg_communication,
    AVG(quality_rating)::DECIMAL(3,2) as avg_quality,
    AVG(value_rating)::DECIMAL(3,2) as avg_value,
    AVG(delivery_time_rating)::DECIMAL(3,2) as avg_delivery_time,
    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
FROM marketplace_reviews 
WHERE is_deleted = FALSE
GROUP BY reviewee_id, reviewer_type;
