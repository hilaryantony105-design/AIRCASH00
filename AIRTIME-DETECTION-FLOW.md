# How Airtime Detection and Auto-Payment Works

## The Core Problem & Solution

### **The Problem:**
- User sends airtime from their phone to our business number
- We need to detect when airtime arrives
- We need to automatically send money back to the user

### **The Solution:**
We don't actually "send" airtime from the app. Instead, we use **mobile money APIs** to detect when users send us airtime, then automatically send money back.

## How It Actually Works

### 1. **User Sends Airtime (Manual Process)**

The user manually sends airtime using their phone's USSD menu:

\`\`\`
Safaricom Users:
1. Dial *140# (Safaricom airtime transfer)
2. Select "Send Airtime"
3. Enter our business number: +254700000000
4. Enter amount: 100
5. Enter reference: AC-ABC123-XYZ (from our app)
6. Confirm with PIN

Airtel Users:
1. Dial *432# (Airtel airtime transfer)
2. Select "Transfer Airtime"
3. Enter our number: +254730000000
4. Enter amount: 100
5. Enter reference: AC-ABC123-XYZ
6. Confirm with PIN
\`\`\`

### 2. **How We Detect Airtime Arrival**

We use **C2B (Customer to Business)** APIs from both networks:

#### **Safaricom M-Pesa C2B Detection**
\`\`\`typescript
// When user sends airtime, Safaricom sends us a webhook
// POST /api/mpesa/c2b/confirmation
{
  "TransactionType": "Pay Bill",
  "TransID": "NEF61H8J60", // M-Pesa transaction ID
  "TransTime": "20231201143022",
  "TransAmount": "100.00",
  "BusinessShortCode": "174379",
  "BillRefNumber": "AC-ABC123-XYZ", // Our reference
  "InvoiceNumber": "",
  "OrgAccountBalance": "49000.00",
  "ThirdPartyTransID": "",
  "MSISDN": "254712345678", // User's phone number
  "FirstName": "JOHN",
  "MiddleName": "",
  "LastName": "DOE"
}
\`\`\`

#### **Airtel Money C2B Detection**
\`\`\`typescript
// Airtel sends similar webhook to /api/airtel/callback
{
  "transaction": {
    "id": "MP210301.1341.C12345",
    "status": "TS", // Transaction Successful
    "amount": "100",
    "currency": "KES",
    "reference": "AC-ABC123-XYZ",
    "msisdn": "254731234567",
    "created_at": "2023-12-01T14:30:22Z"
  }
}
\`\`\`

### 3. **Automatic Money Sending Process**

When we receive the webhook, our system automatically processes it:

\`\`\`typescript
// /api/mpesa/c2b/confirmation/route.ts
export async function POST(request: NextRequest) {
  const webhook = await request.json()
  
  // 1. VERIFY the webhook is legitimate
  if (!verifyWebhookSignature(webhook)) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid signature" })
  }
  
  // 2. EXTRACT transaction details
  const {
    TransAmount,    // "100.00"
    MSISDN,        // "254712345678" 
    TransID,       // "NEF61H8J60"
    BillRefNumber  // "AC-ABC123-XYZ"
  } = webhook
  
  // 3. FIND the matching conversion request
  const conversion = await getConversionRequestByReference(BillRefNumber)
  
  if (!conversion) {
    console.log("No matching conversion found for reference:", BillRefNumber)
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
  }
  
  // 4. VERIFY amounts match
  if (parseFloat(TransAmount) !== conversion.airtime_amount) {
    console.log("Amount mismatch:", TransAmount, "vs", conversion.airtime_amount)
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Amount mismatch" })
  }
  
  // 5. UPDATE database - mark airtime as received
  await updateConversionRequest(conversion.id, {
    status: "processing",
    airtimeReceived: true,
    notes: `Airtime received via M-Pesa: ${TransID}`
  })
  
  // 6. AUTOMATICALLY SEND MONEY BACK
  try {
    const payoutResponse = await sendMoneyB2C(
      conversion.phone_number,     // "254712345678"
      conversion.payout_amount,    // 82 (82% of 100)
      conversion.reference_code    // "AC-ABC123-XYZ"
    )
    
    if (payoutResponse.ResponseCode === "0") {
      // 7. MARK as completed
      await updateConversionRequest(conversion.id, {
        status: "completed",
        mpesaSent: true,
        mpesaTransactionId: payoutResponse.ConversationID,
        completedAt: new Date()
      })
      
      console.log(`✅ Successfully sent KES ${conversion.payout_amount} to ${conversion.phone_number}`)
    } else {
      throw new Error(`B2C failed: ${payoutResponse.errorMessage}`)
    }
    
  } catch (error) {
    // 8. HANDLE failures
    await updateConversionRequest(conversion.id, {
      status: "failed",
      notes: `Auto-payout failed: ${error.message}`
    })
    
    // TODO: Alert admin for manual intervention
    console.error("❌ Auto-payout failed:", error)
  }
  
  // 9. RESPOND to M-Pesa (required)
  return NextResponse.json({ 
    ResultCode: 0, 
    ResultDesc: "Accepted and processed" 
  })
}
\`\`\`

## The B2C (Business to Customer) Money Sending

### **How We Send Money Back**

\`\`\`typescript
// lib/mpesa.ts - sendMoneyB2C function
export async function sendMoneyB2C(phoneNumber: string, amount: number, reference: string) {
  // 1. GET access token
  const accessToken = await getMpesaAccessToken()
  
  // 2. PREPARE the payout request
  const payload = {
    InitiatorName: "aircash_api",           // Our system username
    SecurityCredential: "encrypted_password", // Our encrypted password
    CommandID: "BusinessPayment",           // Type of transaction
    Amount: amount,                         // 82
    PartyA: "174379",                      // Our business shortcode
    PartyB: phoneNumber,                   // "254712345678"
    Remarks: `Airtime conversion payout - ${reference}`,
    QueueTimeOutURL: `${callbackUrl}/mpesa/b2c/timeout`,
    ResultURL: `${callbackUrl}/mpesa/b2c/result`,
    Occasion: `Conversion ${reference}`
  }
  
  // 3. SEND the request to M-Pesa
  const response = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  
  const result = await response.json()
  
  // 4. M-Pesa responds immediately with status
  if (result.ResponseCode === "0") {
    console.log("✅ B2C request accepted:", result.ConversationID)
    return result
  } else {
    throw new Error(`B2C request failed: ${result.errorMessage}`)
  }
}
\`\`\`

### **B2C Result Webhook**

M-Pesa sends us another webhook when the money transfer completes:

\`\`\`typescript
// /api/mpesa/b2c/result/route.ts
export async function POST(request: NextRequest) {
  const webhook = await request.json()
  
  const { Result } = webhook
  const { ResultCode, ResultDesc, ConversationID } = Result
  
  if (ResultCode === 0) {
    console.log("✅ Money successfully sent to customer")
    
    // Extract transaction details
    const resultParams = Result.ResultParameters?.ResultParameter || []
    const transactionId = resultParams.find(p => p.Key === "TransactionReceipt")?.Value
    const amount = resultParams.find(p => p.Key === "TransactionAmount")?.Value
    
    // Update our records
    await recordMpesaTransaction({
      transactionType: "B2C",
      mpesaReceiptNumber: transactionId,
      amount: parseFloat(amount),
      status: "completed",
      rawResponse: webhook
    })
    
  } else {
    console.error("❌ B2C payment failed:", ResultDesc)
    
    // TODO: Retry payment or alert admin
    await handleFailedPayout(ConversationID, ResultDesc)
  }
  
  return NextResponse.json({ message: "B2C result processed" })
}
\`\`\`

## Visual Flow Diagram

\`\`\`
USER PHONE                    OUR SYSTEM                    TELCO APIs
     │                            │                            │
     │ 1. Dial *140#              │                            │
     │ 2. Send KES 100 airtime    │                            │
     │    to +254700000000        │                            │
     │    ref: AC-ABC123-XYZ      │                            │
     │                            │                            │
     │                            │ ◄─── 3. C2B Webhook ──────┤
     │                            │     (Airtime received)     │
     │                            │                            │
     │                            │ 4. Find conversion         │
     │                            │    by reference            │
     │                            │                            │
     │                            │ 5. Calculate payout        │
     │                            │    (KES 100 × 82% = 82)   │
     │                            │                            │
     │                            │ ──── 6. B2C Request ─────► │
     │                            │     (Send KES 82)          │
     │                            │                            │
     │                            │ ◄─── 7. B2C Result ───────┤
     │                            │     (Success/Failure)      │
     │                            │                            │
     │ ◄─── 8. M-Pesa SMS ────────┼────────────────────────────┤
     │     "You have received     │                            │
     │      KES 82 from..."       │                            │
\`\`\`

## Key Technical Details

### **1. Webhook Security**
\`\`\`typescript
// We verify webhooks are legitimate
function verifyMpesaWebhook(signature: string, payload: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.MPESA_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
\`\`\`

### **2. Reference Code Matching**
\`\`\`typescript
// We match incoming airtime to conversion requests using reference codes
const conversion = await sql`
  SELECT * FROM conversion_requests 
  WHERE reference_code = ${BillRefNumber}
  AND status = 'pending'
  AND airtime_amount = ${parseFloat(TransAmount)}
`
\`\`\`

### **3. Idempotency Protection**
\`\`\`typescript
// Prevent duplicate processing
const existingTransaction = await sql`
  SELECT * FROM mpesa_transactions 
  WHERE mpesa_receipt_number = ${TransID}
`

if (existingTransaction.length > 0) {
  console.log("Transaction already processed:", TransID)
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Already processed" })
}
\`\`\`

### **4. Error Handling & Retries**
\`\`\`typescript
// If auto-payout fails, we retry
async function retryFailedPayout(conversionId: number, maxRetries: number = 3) {
  const conversion = await getConversionRequest(conversionId)
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendMoneyB2C(
        conversion.phone_number,
        conversion.payout_amount,
        conversion.reference_code
      )
      
      if (result.ResponseCode === "0") {
        await updateConversionRequest(conversionId, {
          status: "completed",
          mpesaSent: true,
          completedAt: new Date()
        })
        return true
      }
    } catch (error) {
      console.log(`Retry attempt ${attempt} failed:`, error.message)
      
      if (attempt === maxRetries) {
        // Alert admin for manual intervention
        await alertAdmin(`Failed payout after ${maxRetries} attempts`, {
          conversionId,
          phoneNumber: conversion.phone_number,
          amount: conversion.payout_amount,
          error: error.message
        })
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  
  return false
}
\`\`\`

## What Happens If Something Goes Wrong?

### **1. User Sends Wrong Amount**
\`\`\`typescript
if (parseFloat(TransAmount) !== conversion.airtime_amount) {
  // We don't send money back, but we log it
  await recordMpesaTransaction({
    transactionType: "C2B",
    status: "amount_mismatch",
    notes: `Expected ${conversion.airtime_amount}, got ${TransAmount}`
  })
  
  // TODO: Send SMS to user explaining the issue
  await sendSMS(MSISDN, `Amount mismatch. Expected KES ${conversion.airtime_amount}, received KES ${TransAmount}. Contact support.`)
}
\`\`\`

### **2. B2C Payment Fails**
\`\`\`typescript
if (payoutResponse.ResponseCode !== "0") {
  // Mark for manual review
  await updateConversionRequest(conversion.id, {
    status: "payout_failed",
    notes: `B2C failed: ${payoutResponse.errorMessage}`
  })
  
  // Alert admin immediately
  await alertAdmin("B2C Payment Failed", {
    reference: conversion.reference_code,
    amount: conversion.payout_amount,
    phoneNumber: conversion.phone_number,
    error: payoutResponse.errorMessage
  })
  
  // Schedule retry in 5 minutes
  await scheduleRetry(conversion.id, new Date(Date.now() + 5 * 60 * 1000))
}
\`\`\`

### **3. Webhook Not Received**
\`\`\`typescript
// We run a reconciliation job every hour
async function reconcileTransactions() {
  // Find conversions pending for more than 30 minutes
  const stuckConversions = await sql`
    SELECT * FROM conversion_requests 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '30 minutes'
  `
  
  for (const conversion of stuckConversions) {
    // Check with M-Pesa API directly
    const status = await queryTransactionStatus(conversion.reference_code)
    
    if (status === 'completed') {
      // Webhook was missed, process manually
      await processConversion(conversion)
    }
  }
}
\`\`\`

## Summary: The Magic Explained

1. **User Action**: User manually sends airtime using USSD (*140# for Safaricom)
2. **Detection**: Telco sends us a webhook when airtime arrives
3. **Matching**: We match the webhook to a conversion request using the reference code
4. **Verification**: We verify amounts match and webhook is legitimate
5. **Auto-Payout**: We automatically send money back using B2C API
6. **Confirmation**: We get another webhook confirming money was sent
7. **Completion**: User receives M-Pesa SMS with their payout

**The key insight**: We don't "send" airtime from the app. We detect when users send us airtime manually, then automatically send money back. The app is essentially a sophisticated webhook processor that matches incoming airtime to payout requests.

This is why the business model works - we receive airtime (which we can sell or use) and send back cash at a lower rate, keeping the difference as profit.
