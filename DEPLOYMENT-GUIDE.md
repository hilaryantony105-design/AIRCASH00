# AirCash Pro - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Vercel (Recommended)
1. Visit [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository
5. Add environment variables (see below)
6. Deploy!

### Option 2: Railway
1. Visit [railway.app](https://railway.app)
2. Connect GitHub account
3. Create new project from repository
4. Add environment variables
5. Deploy automatically

### Option 3: Render
1. Visit [render.com](https://render.com)
2. Connect GitHub account
3. Create new Web Service
4. Select your repository
5. Configure environment variables
6. Deploy

## 🔧 Environment Variables Setup

Copy these variables to your hosting platform:

### Database (Required)
```
DATABASE_URL=postgresql://username:password@host:port/database
```

### M-Pesa Configuration (Required)
```
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_BUSINESS_SHORTCODE=your_business_shortcode
MPESA_PASSKEY=your_mpesa_passkey
MPESA_ENVIRONMENT=production
MPESA_CALLBACK_URL=https://your-domain.com/api
MPESA_INITIATOR_NAME=your_initiator_name
MPESA_SECURITY_CREDENTIAL=your_security_credential
```

### Airtel Money Configuration (Required)
```
AIRTEL_CLIENT_ID=your_airtel_client_id
AIRTEL_CLIENT_SECRET=your_airtel_client_secret
AIRTEL_API_KEY=your_airtel_api_key
AIRTEL_ENVIRONMENT=production
AIRTEL_CALLBACK_URL=https://your-domain.com/api/airtel/callback
AIRTEL_MERCHANT_ID=your_merchant_id
AIRTEL_MERCHANT_PIN=your_merchant_pin
```

### App Configuration (Required)
```
ADMIN_TOKEN=your_random_secret_key_for_admin_access
```

## 🗄️ Database Setup

### For Production (Recommended)
1. **Neon PostgreSQL**: [neon.tech](https://neon.tech)
2. **Railway PostgreSQL**: [railway.app](https://railway.app)
3. **Supabase**: [supabase.com](https://supabase.com)

### Database Migration
After setting up your database, run these SQL commands:

```sql
-- Create tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE conversion_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    phone_number VARCHAR(15) NOT NULL,
    airtime_amount INTEGER NOT NULL,
    payout_amount INTEGER NOT NULL,
    conversion_rate DECIMAL(4,2) NOT NULL,
    network VARCHAR(20) DEFAULT 'safaricom',
    status VARCHAR(20) DEFAULT 'pending',
    reference_code VARCHAR(50) UNIQUE NOT NULL,
    airtime_received BOOLEAN DEFAULT FALSE,
    mpesa_sent BOOLEAN DEFAULT FALSE,
    mpesa_transaction_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);

CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO system_settings VALUES
('default_conversion_rate', '0.75', 'Safaricom rate (75%)'),
('airtel_conversion_rate', '0.70', 'Airtel rate (70%)'),
('min_conversion_amount', '20', 'Minimum amount'),
('max_conversion_amount', '1000', 'Maximum amount'),
('airtime_receive_number', '+254700000000', 'Safaricom receive number'),
('airtel_receive_number', '+254730000000', 'Airtel receive number');
```

## 🔗 Payment API Setup

### M-Pesa (Safaricom)
1. Visit [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create developer account
3. Create new app
4. Get API credentials
5. Configure webhooks:
   - Validation URL: `https://your-domain.com/api/mpesa/c2b/validation`
   - Confirmation URL: `https://your-domain.com/api/mpesa/c2b/confirmation`
   - B2C Result URL: `https://your-domain.com/api/mpesa/b2c/result`

### Airtel Money
1. Visit [developers.airtel.africa](https://developers.airtel.africa)
2. Create developer account
3. Get API credentials
4. Configure callback URL: `https://your-domain.com/api/airtel/callback`

## 🧪 Testing After Deployment

1. **Test the homepage**: Visit your deployed URL
2. **Test conversion flow**: Try creating a test conversion
3. **Test admin access**: Visit `/admin/login`
4. **Test webhooks**: Use ngrok for local testing

## 🔍 Troubleshooting

### Common Issues
1. **Database connection failed**: Check DATABASE_URL format
2. **Webhooks not working**: Verify HTTPS URLs and API credentials
3. **Build errors**: Check environment variables are set correctly
4. **Payment failures**: Verify API credentials and environment settings

### Support
- Check the logs in your hosting platform
- Verify all environment variables are set
- Test API credentials in sandbox first

## 📞 Support

For deployment issues, check:
- [SETUP.md](./SETUP.md) - Initial setup instructions
- [HOW-IT-WORKS.md](./HOW-IT-WORKS.md) - Technical details
- [README.md](./README.md) - Project overview
