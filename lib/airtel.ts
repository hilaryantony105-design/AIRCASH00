// Airtel Money API configuration
const AIRTEL_CONFIG = {
  clientId: process.env.AIRTEL_CLIENT_ID!,
  clientSecret: process.env.AIRTEL_CLIENT_SECRET!,
  apiKey: process.env.AIRTEL_API_KEY!,
  environment: process.env.AIRTEL_ENVIRONMENT || "staging", // staging or production
  callbackUrl: process.env.AIRTEL_CALLBACK_URL!,
  merchantId: process.env.AIRTEL_MERCHANT_ID!,
  merchantPin: process.env.AIRTEL_MERCHANT_PIN!,
}

const BASE_URL =
  AIRTEL_CONFIG.environment === "production" ? "https://openapi.airtel.africa" : "https://openapiuat.airtel.africa"

// Generate Airtel Money access token
export async function getAirtelAccessToken(): Promise<string> {
  const response = await fetch(`${BASE_URL}/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify({
      client_id: AIRTEL_CONFIG.clientId,
      client_secret: AIRTEL_CONFIG.clientSecret,
      grant_type: "client_credentials",
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Failed to get Airtel access token: ${data.message || "Unknown error"}`)
  }

  return data.access_token
}

// Send money via Airtel Money (Disbursement)
export async function sendMoneyAirtel(phoneNumber: string, amount: number, reference: string) {
  const accessToken = await getAirtelAccessToken()

  // Format phone number for Airtel (remove + and country code, keep local format)
  const formattedPhone = phoneNumber.replace(/^\+254/, "").replace(/^0/, "")

  const payload = {
    reference: reference,
    subscriber: {
      country: "KE",
      currency: "KES",
      msisdn: formattedPhone,
    },
    transaction: {
      amount: amount,
      country: "KE",
      currency: "KES",
      id: reference,
    },
  }

  const response = await fetch(`${BASE_URL}/standard/v1/disbursements/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "*/*",
      "X-Country": "KE",
      "X-Currency": "KES",
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()
  return result
}

// Check transaction status
export async function checkAirtelTransactionStatus(transactionId: string) {
  const accessToken = await getAirtelAccessToken()

  const response = await fetch(`${BASE_URL}/standard/v1/payments/${transactionId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "*/*",
      "X-Country": "KE",
      "X-Currency": "KES",
    },
  })

  return response.json()
}

// Request payment from customer (Collection)
export async function requestAirtelPayment(phoneNumber: string, amount: number, reference: string) {
  const accessToken = await getAirtelAccessToken()

  const formattedPhone = phoneNumber.replace(/^\+254/, "").replace(/^0/, "")

  const payload = {
    reference: reference,
    subscriber: {
      country: "KE",
      currency: "KES",
      msisdn: formattedPhone,
    },
    transaction: {
      amount: amount,
      country: "KE",
      currency: "KES",
      id: reference,
    },
  }

  const response = await fetch(`${BASE_URL}/merchant/v1/payments/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "*/*",
      "X-Country": "KE",
      "X-Currency": "KES",
    },
    body: JSON.stringify(payload),
  })

  return response.json()
}

// Airtel Money callback verification
export function verifyAirtelCallback(signature: string, payload: string): boolean {
  // Implement signature verification based on Airtel's documentation
  // This is a placeholder - you'll need to implement the actual verification
  return true
}
