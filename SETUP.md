# AirCash Pro Setup Guide - Airtime Buying System

## What This System Does

This is an **airtime buying system** where:
- Users **sell their airtime** to you via USSD codes
- You **pay them cash** via M-Pesa/Airtel Money at a commission rate
- You **keep the airtime** they send (which you can sell later)

## Business Model

- **Safaricom**: Pay users 75% of their airtime value (you keep 25%)
- **Airtel**: Pay users 70% of their airtime value (you keep 30%)
- **Example**: User sends KES 100 airtime → You pay them KES 75 → You keep KES 25 profit

## Environment Variables Required

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=your_neon_database_connection_string

# M-Pesa API Configuration
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_BUSINESS_SHORTCODE=your_business_shortcode
MPESA_PASSKEY=your_mpesa_passkey
MPESA_ENVIRONMENT=sandbox
MPESA_CALLBACK_URL=https://your-domain.com/api
MPESA_INITIATOR_NAME=your_initiator_name
MPESA_SECURITY_CREDENTIAL=your_security_credential

# Airtel Money API Configuration
AIRTEL_CLIENT_ID=your_airtel_client_id
AIRTEL_CLIENT_SECRET=your_airtel_client_secret
AIRTEL_API_KEY=your_airtel_api_key
AIRTEL_ENVIRONMENT=staging
AIRTEL_CALLBACK_URL=https://your-domain.com/api/airtel/callback
AIRTEL_MERCHANT_ID=your_merchant_id
AIRTEL_MERCHANT_PIN=your_merchant_pin

# App Configuration
ADMIN_TOKEN=your_random_secret_key_for_admin_access

# Optional: Debug mode
DEBUG=false
NODE_ENV=development
```

## Setup Steps

### 1. Database Setup
1. Create a Neon PostgreSQL database
2. Run the SQL scripts in order:
   ```bash
   psql $DATABASE_URL -f scripts/01-create-tables.sql
   psql $DATABASE_URL -f scripts/02-add-airtel-support.sql
   ```

### 2. M-Pesa Configuration
1. Get your API credentials from [Safaricom Developer Portal](https://developer.safaricom.co.ke)
2. Set up your business shortcode and passkey
3. Configure webhook URLs in your M-Pesa app:
   - Validation URL: `https://your-domain.com/api/mpesa/c2b/validation`
   - Confirmation URL: `https://your-domain.com/api/mpesa/c2b/confirmation`
   - Result URL: `https://your-domain.com/api/mpesa/b2c/result`
   - Timeout URL: `https://your-domain.com/api/mpesa/b2c/timeout`

### 3. Airtel Money Configuration
1. Get your API credentials from [Airtel Developers](https://developers.airtel.africa)
2. Configure callback URL: `https://your-domain.com/api/airtel/callback`

### 4. Register C2B URLs (One-time setup)
After setting up environment variables, run:
```bash
node scripts/register-c2b-urls.js
```

### 5. Start the Application
```bash
npm install
npm run dev
```

## How It Works

### User Flow:
1. **User visits website** and enters phone number + airtime amount
2. **System generates reference code** and shows USSD instructions
3. **User dials USSD code**:
   - **Safaricom**: `*140*amount*yournumber#`
   - **Airtel**: `*432*amount*yournumber#`
4. **System detects airtime received** via webhook
5. **System automatically pays user** via B2C/disbursement
6. **User receives cash** via M-Pesa/Airtel Money

### USSD Codes:
- **Safaricom**: `*140*amount*yournumber#` (Sambaza credit)
- **Airtel**: `*432*amount*yournumber#` (Transfer airtime)

## Testing

### Test M-Pesa Flow
1. Create an airtime sale request via the web interface
2. Use M-Pesa sandbox to send airtime to your business shortcode
3. Include the reference code in the payment
4. Check the sale status

### Test Airtel Flow
1. Create an airtime sale request for Airtel
2. Use Airtel staging environment to send airtime
3. Include the reference code in the payment
4. Check the sale status

## Admin Access

1. Set `ADMIN_TOKEN` in your environment variables
2. Visit `/admin/login` and enter the token
3. Access the admin dashboard at `/admin`

## Troubleshooting

### Common Issues
1. **Database Connection**: Verify `DATABASE_URL` is correct
2. **M-Pesa Errors**: Check all M-Pesa credentials and webhook URLs
3. **Airtel Errors**: Verify Airtel credentials and environment
4. **Webhook Issues**: Ensure callback URLs are publicly accessible

### Debug Mode
Set `DEBUG=true` in your environment to enable detailed logging.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use production URLs for all callback URLs
3. Set `MPESA_ENVIRONMENT=production` and `AIRTEL_ENVIRONMENT=production`
4. Ensure all webhook URLs use HTTPS
5. Set up proper monitoring and alerting

## Important Notes

- **This system BUYS airtime from users** (not sells airtime to them)
- **Users send airtime to you** via USSD codes
- **You pay them cash** at a commission rate
- **You keep the airtime** they send (your profit)
- **Minimum amount**: KES 20, **Maximum amount**: KES 1,000
