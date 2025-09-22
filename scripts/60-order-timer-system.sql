-- Add timer and cancellation columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_cancel_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS extension_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS extension_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS extension_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_delivery_time INTEGER;

-- Create order extensions table for tracking extension requests
CREATE TABLE IF NOT EXISTS order_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    responded_by UUID REFERENCES users(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    response_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order cancellations table for detailed cancellation tracking
CREATE TABLE IF NOT EXISTS order_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    cancelled_by UUID NOT NULL REFERENCES users(id),
    cancellation_type VARCHAR(30) NOT NULL, -- 'seller_cancel', 'buyer_cancel', 'auto_timeout', 'dispute_cancel'
    reason TEXT NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_processed BOOLEAN DEFAULT FALSE,
    refund_processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_timer_started_at ON orders(timer_started_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_expires_at ON orders(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_order_extensions_order_id ON order_extensions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_extensions_status ON order_extensions(status);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_order_id ON order_cancellations(order_id);

-- Function to automatically start timer when order is accepted
CREATE OR REPLACE FUNCTION start_order_timer()
RETURNS TRIGGER AS $$
BEGIN
    -- Only start timer when status changes to 'in_progress'
    IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
        -- Get delivery time from marketplace item
        SELECT delivery_time INTO NEW.original_delivery_time
        FROM marketplace_items 
        WHERE id = NEW.marketplace_item_id;
        
        -- Set timer start and expiration
        NEW.timer_started_at = NOW();
        NEW.expires_at = NOW() + INTERVAL '1 day' * NEW.original_delivery_time;
        NEW.auto_cancel_at = NEW.expires_at + INTERVAL '1 hour'; -- Grace period
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timer start
DROP TRIGGER IF EXISTS trigger_start_order_timer ON orders;
CREATE TRIGGER trigger_start_order_timer
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION start_order_timer();

-- Function to handle automatic order cancellation
CREATE OR REPLACE FUNCTION auto_cancel_expired_orders()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    expired_order RECORD;
BEGIN
    -- Find orders that have expired and should be auto-cancelled
    FOR expired_order IN 
        SELECT id, buyer_id, seller_id, amount
        FROM orders 
        WHERE status = 'in_progress' 
        AND auto_cancel_at < NOW()
        AND cancelled_at IS NULL
    LOOP
        -- Update order status to cancelled
        UPDATE orders 
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = 'Automatic cancellation due to delivery timeout'
        WHERE id = expired_order.id;
        
        -- Record cancellation details
        INSERT INTO order_cancellations (
            order_id, cancelled_by, cancellation_type, reason, refund_amount
        ) VALUES (
            expired_order.id, 
            expired_order.seller_id, 
            'auto_timeout', 
            'Order automatically cancelled due to delivery timeout',
            expired_order.amount
        );
        
        -- Process refund to buyer
        UPDATE wallets 
        SET balance = balance + expired_order.amount
        WHERE user_id = expired_order.buyer_id;
        
        -- Record refund transaction
        INSERT INTO wallet_transactions (
            wallet_id, type, amount, description, reference_id, reference_type
        ) SELECT 
            w.id, 'refund', expired_order.amount, 
            'Refund for cancelled order due to timeout', 
            expired_order.id, 'order'
        FROM wallets w 
        WHERE w.user_id = expired_order.buyer_id;
        
        expired_count := expired_count + 1;
    END LOOP;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;
