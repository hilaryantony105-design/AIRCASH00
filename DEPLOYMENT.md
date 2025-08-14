# 🚀 AirCash Pro - Real Device Testing & Deployment Guide

This guide will help you deploy your airtime conversion system and connect it to real M-Pesa and Airtel APIs for testing on actual devices.

## 📋 Quick Setup Checklist

- [ ] Set up free PostgreSQL database
- [ ] Get M-Pesa sandbox credentials
- [ ] Get Airtel staging credentials  
- [ ] Deploy to Vercel
- [ ] Configure webhooks
- [ ] Test on real device

## 🎯 **Step 1: Set Up Free PostgreSQL Database**

### Option A: Neon (Recommended - Free 512MB)
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create a new project: `aircash-pro`
4. Copy the connection string (looks like: `postgresql://username:password@host/database`)
5. Update your `.env.local` with the `DATABASE_URL`

### Option B: Supabase (Alternative - Free 500MB)
1. Go to [supabase.com](https://supabase.com)
2. Create new project: `aircash-pro`
3. Go to Settings → Database
4. Copy the connection string
5. Update your `.env.local` with the `DATABASE_URL`

## 🔑 **Step 2: Get M-Pesa Sandbox Credentials**

### Register on Safaricom Developer Portal
1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create account and login
3. Create a new app: "AirCash Pro"
4. Select these APIs:
   - **M-Pesa Express** (for STK Push)
   - **Customer to Business (C2B)** (for receiving airtime)
   - **Business to Customer (B2C)** (for sending money)

### Get Your Credentials
After creating the app, you'll get:
```bash
MPESA_CONSUMER_KEY="your_consumer_key_here"
MPESA_CONSUMER_SECRET="your_consumer_secret_here"
MPESA_BUSINESS_SHORTCODE="174379"  # This is the test shortcode
MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
```

### Generate Security Credential
1. Download the sandbox certificate from Safaricom
2. Use the security credential generator or use test credential:
```bash
MPESA_SECURITY_CREDENTIAL="your_encrypted_initiator_password"
```

## 📱 **Step 3: Get Airtel Staging Credentials**

### Register on Airtel Developer Portal
1. Go to [developers.airtel.africa](https://developers.airtel.africa)
2. Create account and complete KYC
3. Create new application: "AirCash Pro"
4. Subscribe to these APIs:
   - **Collections API** (receive payments)
   - **Disbursements API** (send money)

### Your Airtel Credentials
```bash
AIRTEL_CLIENT_ID="your_client_id"
AIRTEL_CLIENT_SECRET="your_client_secret"
AIRTEL_API_KEY="your_api_key"
```

## 🌐 **Step 4: Deploy to Vercel**

### Deploy via GitHub (Recommended)
1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/aircash-pro.git
git push -u origin main
```

2. Connect to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard

### Deploy via Vercel CLI
```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod

# Add environment variables
vercel env add MPESA_CONSUMER_KEY
vercel env add MPESA_CONSUMER_SECRET
# ... add all your env vars
```

## 🔗 **Step 5: Configure Webhooks**

After deployment, you'll get a URL like: `https://aircash-pro-yourname.vercel.app`

### Configure M-Pesa Webhooks
1. Go to Safaricom Developer Portal
2. Your app → APIs → C2B
3. Set URLs:
   - **Validation URL**: `https://your-domain.vercel.app/api/mpesa/c2b/validation`
   - **Confirmation URL**: `https://your-domain.vercel.app/api/mpesa/c2b/confirmation`

### Configure Airtel Webhooks
1. In Airtel Developer Portal
2. Set callback URL: `https://your-domain.vercel.app/api/airtel/callback`

## 📱 **Step 6: Test on Real Device**

### Test the Complete Flow
1. Visit your deployed URL on mobile: `https://your-domain.vercel.app`
2. Enter your real phone number
3. Enter airtime amount (start with KES 20)
4. Click "Convert Safaricom Airtime"
5. Click "Open Dial Pad" button
6. Your phone will open with USSD code: `*140*20*174379#`
7. Dial and send airtime
8. Wait 1-2 minutes for automatic money back

### Expected Flow
```
You send KES 20 airtime → System receives webhook → 
System sends you KES 15 (75% rate) via M-Pesa
```

## 🛠️ **Step 7: Switch Database from SQLite**

Since you're using SQLite for local testing, let's switch to PostgreSQL for production:

1. Update `lib/database.ts`:
```typescript
// Switch from SQLite to PostgreSQL for production
import { neon } from '@neondatabase/serverless'
// Comment out the SQLite import and use PostgreSQL functions instead
```

2. Run the database migration:
```bash
# Run the SQL scripts against your PostgreSQL database
node scripts/01-create-tables.sql
```

## 🔍 **Troubleshooting**

### Common Issues
1. **Webhook not received**: Check HTTPS URLs, ensure they're publicly accessible
2. **M-Pesa authentication failed**: Verify consumer key/secret
3. **Database connection failed**: Check DATABASE_URL format
4. **CORS errors**: Add your domain to allowed origins

### Debug Tools
- Check webhook logs in Vercel dashboard
- Use M-Pesa API logs in developer portal
- Monitor database with admin dashboard: `/admin`

## 🎉 **You're Ready!**

Once deployed with real APIs, your system will:
- ✅ Accept real airtime from customers
- ✅ Automatically send real money back
- ✅ Work on any mobile device
- ✅ Handle multiple concurrent transactions
- ✅ Provide admin dashboard for monitoring

## 🔐 **Security Notes**

- Never commit real API keys to GitHub
- Use different credentials for staging/production
- Monitor transactions in admin dashboard
- Set up alerts for failed transactions

## 💰 **Business Notes**

- Start with small amounts (KES 20-100) for testing
- Monitor conversion rates and adjust if needed
- Track profit margins in admin dashboard
- Consider implementing daily/monthly limits

---

**Need Help?** Check the logs in Vercel dashboard or run the test script: `node scripts/test-conversion.js`
