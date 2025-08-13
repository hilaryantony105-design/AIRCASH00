-- Add network column to conversion_requests table
ALTER TABLE conversion_requests 
ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'safaricom';

-- Add network-specific settings for airtime buying
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('airtel_conversion_rate', '0.70', 'Default rate we pay for Airtel airtime (70%)'),
('airtel_receive_number', '+254730000000', 'Phone number to receive Airtel airtime from users')
ON CONFLICT (setting_key) DO NOTHING;

-- Update conversion_requests table to include network in indexes
CREATE INDEX IF NOT EXISTS idx_conversion_requests_network ON conversion_requests(network);

-- Add Airtel transaction types to mpesa_transactions table (rename to mobile_transactions)
ALTER TABLE mpesa_transactions 
ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'safaricom';

-- Create index for network
CREATE INDEX IF NOT EXISTS idx_mobile_transactions_network ON mpesa_transactions(network);
