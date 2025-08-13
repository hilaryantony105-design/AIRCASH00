// M-Pesa API configuration
const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE!,
  passkey: process.env.MPESA_PASSKEY!,
  environment: process.env.MPESA_ENVIRONMENT || "sandbox", // sandbox or production
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
}

const BASE_URL =
  MPESA_CONFIG.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"

// Generate M-Pesa access token
export async function getMpesaAccessToken(): Promise<string> {
  const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString("base64")

  const response = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${data.error_description || "Unknown error"}`)
  }

  return data.access_token
}

// Generate password for STK Push
function generateSTKPassword(timestamp: string): string {
  const data = MPESA_CONFIG.businessShortCode + MPESA_CONFIG.passkey + timestamp
  return Buffer.from(data).toString("base64")
}

// Register URLs for C2B (receiving airtime payments)
export async function registerC2BUrls() {
  const accessToken = await getMpesaAccessToken()

  const payload = {
    ShortCode: MPESA_CONFIG.businessShortCode,
    ResponseType: "Completed",
    ConfirmationURL: `${MPESA_CONFIG.callbackUrl}/mpesa/c2b/confirmation`,
    ValidationURL: `${MPESA_CONFIG.callbackUrl}/mpesa/c2b/validation`,
  }

  const response = await fetch(`${BASE_URL}/mpesa/c2b/v1/registerurl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return response.json()
}

// B2C - Send money to customer
export async function sendMoneyB2C(phoneNumber: string, amount: number, reference: string) {
  const accessToken = await getMpesaAccessToken()

  // Format phone number (remove + and ensure it starts with 254)
  const formattedPhone = phoneNumber.replace(/^\+/, "").replace(/^0/, "254")

  const payload = {
    InitiatorName: MPESA_CONFIG.initiatorName,
    SecurityCredential: MPESA_CONFIG.securityCredential,
    CommandID: "BusinessPayment", // or "SalaryPayment" for lower charges
    Amount: amount,
    PartyA: MPESA_CONFIG.businessShortCode,
    PartyB: formattedPhone,
    Remarks: `Airtime conversion payout - ${reference}`,
    QueueTimeOutURL: `${MPESA_CONFIG.callbackUrl}/mpesa/b2c/timeout`,
    ResultURL: `${MPESA_CONFIG.callbackUrl}/mpesa/b2c/result`,
    Occasion: `Conversion ${reference}`,
  }

  const response = await fetch(`${BASE_URL}/mpesa/b2c/v1/paymentrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return response.json()
}

// STK Push - Request payment from customer (for buy airtime feature)
export async function initiateSTKPush(phoneNumber: string, amount: number, reference: string) {
  const accessToken = await getMpesaAccessToken()
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14)
  const password = generateSTKPassword(timestamp)

  // Format phone number
  const formattedPhone = phoneNumber.replace(/^\+/, "").replace(/^0/, "254")

  const payload = {
    BusinessShortCode: MPESA_CONFIG.businessShortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: MPESA_CONFIG.businessShortCode,
    PhoneNumber: formattedPhone,
    CallBackURL: `${MPESA_CONFIG.callbackUrl}/mpesa/stk/callback`,
    AccountReference: reference,
    TransactionDesc: `Payment for ${reference}`,
  }

  const response = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return response.json()
}

// Query STK Push status
export async function querySTKPushStatus(checkoutRequestId: string) {
  const accessToken = await getMpesaAccessToken()
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14)
  const password = generateSTKPassword(timestamp)

  const payload = {
    BusinessShortCode: MPESA_CONFIG.businessShortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  }

  const response = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return response.json()
}
