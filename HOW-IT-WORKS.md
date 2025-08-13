# AirCash Pro - How Everything Works

A comprehensive technical guide explaining how the airtime buying system operates from end to end.

## 🏗️ System Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   Next.js API    │    │   PostgreSQL    │
│   (React/TS)    │◄──►│   (Serverless)   │◄──►│   (Neon DB)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   M-Pesa API    │    │   Airtel API     │    │   Webhooks      │
│   (Safaricom)   │    │   (Airtel Money) │    │   (Callbacks)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🎯 Business Model

**AirCash Pro** is an **airtime buying system** where:
- **Users sell their airtime** to you via USSD codes
- **You pay them cash** via M-Pesa/Airtel Money at a commission rate
- **You keep the airtime** they send (which you can sell later)

### Conversion Rates
- **Safaricom**: 75% (you pay KES 75 for KES 100 airtime)
- **Airtel**: 70% (you pay KES 70 for KES 100 airtime)

### Amount Limits
- **Minimum**: KES 20
- **Maximum**: KES 1,000 per transaction

## 🔄 Complete User Flow

### 1. **User Initiates Sale**
```
User visits website → Clicks "Sell Your Airtime" → Modal opens
```

**Frontend Process:**
- User selects network (Safaricom/Airtel)
- Enters phone number (validated for network)
- Enters airtime amount (20-1000 KES)
- System calculates payout in real-time
- User submits form

**Backend Process:**
- Validates phone number format
- Checks amount limits
- Retrieves network-specific settings
- Calculates payout amount
- Creates database record
- Generates unique reference code

### 2. **System Creates Conversion Request**
```typescript
// API: POST /api/conversion/create
{
  phoneNumber: "+254712345678",
  airtimeAmount: 100,
  network: "safaricom"
}

// Response:
{
  success: true,
  data: {
    reference: "AC-ABC123-XYZ",
    phoneNumber: "+254712345678",
    airtimeAmount: 100,
    payoutAmount: 75,
    network: "safaricom",
    airtimeReceiveNumber: "+254700000000"
  }
}
```

**Database Operations:**
- Creates/retrieves user record
- Inserts conversion request with status "pending"
- Stores network information and conversion rate
- Generates unique reference code (format: AC-timestamp-random)

### 3. **User Receives USSD Instructions**
```
System shows modal with:
- Step 1: Confirm details
- Step 2: Send airtime via USSD
- Step 3: Receive money
```

**USSD Code Generation:**
- **Safaricom**: `*140*amount*yournumber#`
- **Airtel**: `*432*amount*yournumber#`

**Example:**
- Amount: KES 100
- Your number: +254700000000
- USSD: `*140*100*+254700000000#`

### 4. **User Executes USSD Transaction**
```
User dials USSD code → Confirms with PIN → Airtime transferred
```

**What Happens:**
- User's phone opens dialer with pre-filled USSD code
- User confirms the transaction with their PIN
- Airtime is transferred from user to your number
- User receives SMS confirmation from their network

### 5. **System Detects Airtime Received**
```
Network sends webhook → System processes → Updates database
```

**Webhook Flow:**
- **M-Pesa**: C2B confirmation webhook to `/api/mpesa/c2b/confirmation`
- **Airtel**: Collection callback to `/api/airtel/callback`

**Processing Steps:**
1. **Verify webhook authenticity**
2. **Extract transaction details** (amount, phone, reference)
3. **Find matching conversion request** by reference
4. **Verify amount matches** exactly
5. **Update database** - mark airtime as received
6. **Change status** to "processing"

### 6. **System Automatically Pays User**
```
System sends money → User receives cash → Transaction completed
```

**Payment Process:**
- **Safaricom**: B2C (Business to Customer) via M-Pesa
- **Airtel**: Disbursement via Airtel Money API

**What Happens:**
1. System calls payment API with user's phone and payout amount
2. Payment is processed by the network
3. User receives SMS notification of money received
4. System receives payment confirmation webhook
5. Database is updated - status changed to "completed"

## 🗄️ Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### `conversion_requests`
```sql
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
```

#### `mpesa_transactions`
```sql
CREATE TABLE mpesa_transactions (
    id SERIAL PRIMARY KEY,
    conversion_request_id INTEGER REFERENCES conversion_requests(id),
    transaction_type VARCHAR(20) NOT NULL,
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
```

#### `system_settings`
```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key System Settings
```sql
INSERT INTO system_settings VALUES
('default_conversion_rate', '0.75', 'Safaricom rate (75%)'),
('airtel_conversion_rate', '0.70', 'Airtel rate (70%)'),
('min_conversion_amount', '20', 'Minimum amount'),
('max_conversion_amount', '1000', 'Maximum amount'),
('airtime_receive_number', '+254700000000', 'Safaricom receive number'),
('airtel_receive_number', '+254730000000', 'Airtel receive number');
```

## 🔌 API Endpoints

### Conversion Management
- **POST** `/api/conversion/create` - Create new airtime sale request
- **GET** `/api/conversion/status/[reference]` - Check sale status

### M-Pesa Integration
- **POST** `/api/mpesa/c2b/confirmation` - Receive C2B webhooks
- **POST** `/api/mpesa/b2c/result` - Receive B2C result callbacks
- **POST** `/api/mpesa/stk/push` - Initiate STK push (if needed)

### Airtel Integration
- **POST** `/api/airtel/callback` - Receive collection callbacks
- **POST** `/api/airtel/disburse` - Send money to users

### Admin Dashboard
- **GET** `/api/admin/stats` - Dashboard statistics
- **GET** `/api/admin/users` - User management
- **GET** `/api/admin/conversions` - Conversion management

## 🔐 Security & Validation

### Phone Number Validation
```typescript
// Safaricom: 07XX XXX XXX, 01XX XXX XXX
/^(07|01|2547|2541)\d{7}$/

// Airtel: 073X XXX XXX, 078X XXX XXX
/^(073|078|25473|25478)\d{7}$/
```

### Input Validation
- **Phone**: 10-13 characters, valid Kenyan format
- **Amount**: 20-1000 KES, integer only
- **Network**: Must be "safaricom" or "airtel"

### Webhook Security
- **Idempotency checks** prevent duplicate processing
- **Amount verification** ensures exact matches
- **Reference validation** links transactions to requests

## 📱 Frontend Components

### Core Components
1. **`WelcomeScreen`** - Landing page with action buttons
2. **`AirtimeBuyer`** - Main form for airtime sales
3. **`ConversionStatus`** - Status checking interface
4. **`AdminDashboard`** - Admin management interface

### State Management
- **React hooks** for local state
- **Form validation** with react-hook-form + zod
- **Toast notifications** for user feedback
- **Modal dialogs** for focused interactions

### UI Features
- **Responsive design** for all screen sizes
- **Network-specific styling** (green for Safaricom, red for Airtel)
- **Real-time calculations** of payout amounts
- **USSD dial pad integration** with `tel:` protocol

## 🔄 Webhook Processing Flow

### M-Pesa C2B Webhook
```typescript
// 1. Receive webhook
POST /api/mpesa/c2b/confirmation

// 2. Extract data
{
  TransAmount: "100.00",
  MSISDN: "254712345678",
  TransID: "NEF61H8J60",
  BillRefNumber: "AC-ABC123-XYZ"
}

// 3. Process
- Find conversion by BillRefNumber
- Verify amount matches
- Mark airtime as received
- Send B2C payment
- Update status to completed
```

### Airtel Collection Callback
```typescript
// 1. Receive callback
POST /api/airtel/callback

// 2. Extract data
{
  transaction: {
    id: "MP210301.1341.C12345",
    status: "TS",
    amount: "100",
    reference: "AC-ABC123-XYZ",
    msisdn: "254731234567"
  }
}

// 3. Process
- Find conversion by reference
- Verify amount matches
- Mark airtime as received
- Send disbursement
- Update status to completed
```

## 🚀 Deployment & Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:pass@host/db"

# M-Pesa
MPESA_CONSUMER_KEY="your_consumer_key"
MPESA_CONSUMER_SECRET="your_consumer_secret"
MPESA_BUSINESS_SHORTCODE="174379"
MPESA_ENVIRONMENT="sandbox"

# Airtel
AIRTEL_CLIENT_ID="your_client_id"
AIRTEL_CLIENT_SECRET="your_client_secret"
AIRTEL_ENVIRONMENT="sandbox"

# Admin
ADMIN_TOKEN="your_secure_admin_token"
```

### Database Setup
```bash
# 1. Create tables
psql $DATABASE_URL -f scripts/01-create-tables.sql

# 2. Add network columns (if migrating)
psql $DATABASE_URL -f scripts/03-add-network-column.sql

# 3. Test system
node scripts/test-conversion.js
```

### Webhook Configuration
- **M-Pesa**: Register C2B URLs in Safaricom developer portal
- **Airtel**: Configure callback URLs in Airtel developer portal
- **HTTPS required** for production webhooks

## 🧪 Testing & Debugging

### Test Scripts
- **`scripts/test-conversion.js`** - Verify database and API functionality
- **Browser console** - Check for JavaScript errors
- **Network tab** - Monitor API requests and responses

### Common Issues
1. **Missing network column** - Run migration script
2. **Webhook not received** - Check HTTPS and URL configuration
3. **Payment failed** - Verify API credentials and environment
4. **Database connection** - Check DATABASE_URL format

### Debug Tools
- **Console logging** throughout the system
- **Database queries** for transaction tracking
- **Webhook testing** with tools like ngrok
- **Admin dashboard** for real-time monitoring

## 📊 Monitoring & Analytics

### Key Metrics
- **Conversion success rate**
- **Average transaction amount**
- **Network distribution** (Safaricom vs Airtel)
- **Processing time** from airtime to payment
- **Failed transaction analysis**

### Admin Dashboard
- **Real-time statistics**
- **User management**
- **Transaction history**
- **System health monitoring**

## 🔮 Future Enhancements

### Potential Features
- **Bulk airtime purchases**
- **Loyalty program** for repeat users
- **API for third-party integrations**
- **Advanced analytics** and reporting
- **Multi-currency support**
- **Automated reconciliation**

### Scalability Considerations
- **Database indexing** for performance
- **Caching layer** for frequently accessed data
- **Queue system** for webhook processing
- **Load balancing** for high traffic
- **Monitoring and alerting** systems

---

## 📚 Quick Reference

### USSD Codes
- **Safaricom**: `*140*amount*yournumber#`
- **Airtel**: `*432*amount*yournumber#`

### Status Flow
```
pending → processing → completed
   ↓           ↓
airtime    payment
received    sent
```

### Key Files
- **Frontend**: `components/airtime-converter.tsx`
- **API**: `app/api/conversion/create/route.ts`
- **Database**: `lib/database.ts`
- **Webhooks**: `app/api/mpesa/c2b/confirmation/route.ts`

### Support
For technical support or questions, refer to:
- **SETUP.md** - Initial setup instructions
- **README.md** - Project overview
- **AIRTIME-DETECTION-FLOW.md** - Detailed webhook flow
