-- Migration script to add network column to existing tables
-- Run this if you have an existing database without the network column

-- Add network column to conversion_requests table
ALTER TABLE conversion_requests 
ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'safaricom';

-- Add network column to mpesa_transactions table
ALTER TABLE mpesa_transactions 
ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'safaricom';

-- Update existing records to have network = 'safaricom' (default)
UPDATE conversion_requests 
SET network = 'safaricom' 
WHERE network IS NULL;

UPDATE mpesa_transactions 
SET network = 'safaricom' 
WHERE network IS NULL;

-- Create index on network column for better performance
CREATE INDEX IF NOT EXISTS idx_conversion_requests_network ON conversion_requests(network);

-- Add Airtel-specific settings if they don't exist
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('airtel_conversion_rate', '0.70', 'Default rate we pay for Airtel airtime (70%)'),
('airtel_receive_number', '+254730000000', 'Phone number to receive Airtel airtime from users')
ON CONFLICT (setting_key) DO NOTHING;
