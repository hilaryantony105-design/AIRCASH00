-- Create database tables for airtime buying system

-- Users table to store customer information
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Airtime sale requests table
CREATE TABLE IF NOT EXISTS conversion_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    phone_number VARCHAR(15) NOT NULL,
    airtime_amount INTEGER NOT NULL, -- Amount of airtime user wants to sell
    payout_amount INTEGER NOT NULL, -- Amount we will pay user for their airtime
    conversion_rate DECIMAL(4,2) NOT NULL, -- e.g., 0.75 for 75%
    network VARCHAR(20) DEFAULT 'safaricom', -- safaricom, airtel
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    reference_code VARCHAR(50) UNIQUE NOT NULL,
    airtime_received BOOLEAN DEFAULT FALSE,
    mpesa_sent BOOLEAN DEFAULT FALSE,
    mpesa_transaction_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);

-- M-Pesa transactions table
CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id SERIAL PRIMARY KEY,
    conversion_request_id INTEGER REFERENCES conversion_requests(id),
    transaction_type VARCHAR(20) NOT NULL, -- C2B (receiving airtime), B2C (sending money)
    mpesa_receipt_number VARCHAR(50),
    phone_number VARCHAR(15) NOT NULL,
    amount INTEGER NOT NULL,
    transaction_date TIMESTAMP,
    result_code INTEGER,
    result_desc TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    network VARCHAR(20) DEFAULT 'safaricom',
    raw_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings for airtime buying
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('default_conversion_rate', '0.75', 'Default rate we pay for Safaricom airtime (75%)'),
('airtel_conversion_rate', '0.70', 'Default rate we pay for Airtel airtime (70%)'),
('min_conversion_amount', '20', 'Minimum airtime amount we buy'),
('max_conversion_amount', '1000', 'Maximum airtime amount we buy'),
('airtime_receive_number', '+254700000000', 'Phone number to receive Safaricom airtime from users'),
('airtel_receive_number', '+254730000000', 'Phone number to receive Airtel airtime from users'),
('business_shortcode', '174379', 'M-Pesa business shortcode'),
('mpesa_environment', 'sandbox', 'M-Pesa API environment (sandbox/production)')
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversion_requests_phone ON conversion_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversion_requests_status ON conversion_requests(status);
CREATE INDEX IF NOT EXISTS idx_conversion_requests_network ON conversion_requests(network);
CREATE INDEX IF NOT EXISTS idx_conversion_requests_created ON conversion_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_conversion ON mpesa_transactions(conversion_request_id);
