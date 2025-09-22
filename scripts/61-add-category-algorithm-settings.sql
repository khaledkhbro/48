-- Add algorithm settings columns to category tables
-- This allows storing weight, priority, and enabled status directly in the category tables

-- Add algorithm settings to marketplace_categories
ALTER TABLE marketplace_categories 
ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS algorithm_enabled BOOLEAN DEFAULT true;

-- Add algorithm settings to marketplace_subcategories  
ALTER TABLE marketplace_subcategories
ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS algorithm_enabled BOOLEAN DEFAULT true;

-- Add algorithm settings to marketplace_micro_categories
ALTER TABLE marketplace_micro_categories
ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium', 
ADD COLUMN IF NOT EXISTS algorithm_enabled BOOLEAN DEFAULT true;

-- Create indexes for algorithm queries
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_algorithm ON marketplace_categories(algorithm_enabled, priority, weight);
CREATE INDEX IF NOT EXISTS idx_marketplace_subcategories_algorithm ON marketplace_subcategories(algorithm_enabled, priority, weight);
CREATE INDEX IF NOT EXISTS idx_marketplace_micro_categories_algorithm ON marketplace_micro_categories(algorithm_enabled, priority, weight);

-- Update existing categories with default algorithm settings
UPDATE marketplace_categories SET 
  weight = CASE 
    WHEN name = 'Graphics & Design' THEN 80
    WHEN name = 'Programming & Tech' THEN 85
    WHEN name = 'Digital Marketing' THEN 75
    WHEN name = 'Writing & Translation' THEN 70
    ELSE 60
  END,
  priority = CASE
    WHEN name IN ('Graphics & Design', 'Programming & Tech') THEN 'high'
    WHEN name IN ('Digital Marketing', 'Writing & Translation') THEN 'medium'
    ELSE 'low'
  END
WHERE weight IS NULL OR weight = 50;

-- Update popular subcategories with higher weights
UPDATE marketplace_subcategories SET
  weight = CASE
    WHEN name IN ('Logo & Brand Identity', 'Website Development', 'Content Writing') THEN 85
    WHEN name IN ('Web & App Design', 'Mobile App Development', 'SEO') THEN 80
    WHEN name IN ('Social Media Marketing', 'Video Editing') THEN 75
    ELSE 65
  END,
  priority = CASE
    WHEN name IN ('Logo & Brand Identity', 'Website Development', 'Content Writing') THEN 'high'
    WHEN name IN ('Web & App Design', 'Mobile App Development', 'SEO') THEN 'high'
    ELSE 'medium'
  END
WHERE weight IS NULL OR weight = 50;

-- Update popular micro categories with higher weights
UPDATE marketplace_micro_categories SET
  weight = CASE
    WHEN name IN ('Logo Design', 'WordPress', 'Custom Websites', 'Articles & Blog Posts') THEN 90
    WHEN name IN ('Brand Style Guides', 'Shopify', 'Search Engine Optimization') THEN 85
    WHEN name IN ('Website Content', 'Local SEO', 'Business Cards & Stationery') THEN 75
    ELSE 65
  END,
  priority = CASE
    WHEN name IN ('Logo Design', 'WordPress', 'Custom Websites', 'Articles & Blog Posts') THEN 'high'
    WHEN name IN ('Brand Style Guides', 'Shopify', 'Search Engine Optimization') THEN 'high'
    ELSE 'medium'
  END
WHERE weight IS NULL OR weight = 50;
