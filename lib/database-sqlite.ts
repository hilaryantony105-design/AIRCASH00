import Database from 'better-sqlite3'
import path from 'path'
import { z } from 'zod'

// Input validation schemas
const phoneNumberSchema = z.string()
  .regex(/^(\+254|254|0)[17]\d{8}$/, 'Invalid Kenyan phone number')
  .transform(phone => {
    // Normalize to international format
    if (phone.startsWith('0')) return '+254' + phone.substring(1)
    if (phone.startsWith('254')) return '+' + phone
    return phone
  })

const amountSchema = z.number()
  .int('Amount must be an integer')
  .min(20, 'Minimum amount is KES 20')
  .max(1000, 'Maximum amount is KES 1000')

const networkSchema = z.enum(['safaricom', 'airtel'], {
  errorMap: () => ({ message: 'Network must be either safaricom or airtel' })
})

const referenceCodeSchema = z.string()
  .regex(/^AC-[A-Z0-9]+-[A-Z0-9]+$/, 'Invalid reference code format')

// Use SQLite for local testing
const dbPath = path.join(process.cwd(), 'aircash.db')
const db = new Database(dbPath)

// Initialize database tables
function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    )
  `)

  // Conversion requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversion_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      phone_number TEXT NOT NULL,
      airtime_amount INTEGER NOT NULL,
      payout_amount INTEGER NOT NULL,
      conversion_rate REAL NOT NULL,
      network TEXT DEFAULT 'safaricom',
      status TEXT DEFAULT 'pending',
      reference_code TEXT UNIQUE NOT NULL,
      airtime_received BOOLEAN DEFAULT 0,
      mpesa_sent BOOLEAN DEFAULT 0,
      mpesa_transaction_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // System settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Insert default settings
  const settings = db.prepare(`
    INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
    ('default_conversion_rate', '0.75', 'Default rate we pay for Safaricom airtime (75%)'),
    ('airtel_conversion_rate', '0.70', 'Default rate we pay for Airtel airtime (70%)'),
    ('min_conversion_amount', '20', 'Minimum airtime amount we buy'),
    ('max_conversion_amount', '1000', 'Maximum airtime amount we buy'),
    ('airtime_receive_number', '+254700000000', 'Phone number to receive Safaricom airtime from users'),
    ('airtel_receive_number', '+254730000000', 'Phone number to receive Airtel airtime from users')
  `)
  settings.run()
}

// Initialize database on first import
initDatabase()

// User management with validation
export async function createOrGetUser(phoneNumber: string, name?: string) {
  // Validate and normalize phone number
  const validatedPhone = phoneNumberSchema.parse(phoneNumber)
  
  // Sanitize name if provided
  const sanitizedName = name ? name.trim().substring(0, 100) : null
  
  // Try to get existing user first
  const existingUser = db.prepare('SELECT * FROM users WHERE phone_number = ?').get(validatedPhone)
  
  if (existingUser) {
    return existingUser
  }

  // Create new user
  const result = db.prepare('INSERT INTO users (phone_number, name) VALUES (?, ?)').run(validatedPhone, sanitizedName)
  return { id: result.lastInsertRowid, phone_number: validatedPhone, name: sanitizedName }
}

// Generate unique reference code
export function generateReferenceCode(): string {
  const prefix = "AC" // AirCash
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// Create conversion request with validation
export async function createConversionRequest(data: {
  phoneNumber: string
  airtimeAmount: number
  payoutAmount: number
  conversionRate: number
  network?: string
}) {
  // Validate inputs
  const validatedPhone = phoneNumberSchema.parse(data.phoneNumber)
  const validatedAmount = amountSchema.parse(data.airtimeAmount)
  const validatedPayoutAmount = amountSchema.parse(data.payoutAmount)
  const validatedNetwork = networkSchema.parse(data.network || 'safaricom')
  
  // Additional business logic validation
  if (data.conversionRate < 0.5 || data.conversionRate > 1.0) {
    throw new Error('Invalid conversion rate: must be between 0.5 and 1.0')
  }
  
  if (data.payoutAmount >= data.airtimeAmount) {
    throw new Error('Payout amount must be less than airtime amount')
  }
  
  const user = await createOrGetUser(validatedPhone) as any
  const referenceCode = generateReferenceCode()

  const result = db.prepare(`
    INSERT INTO conversion_requests (
      user_id, phone_number, airtime_amount, payout_amount, 
      conversion_rate, reference_code, status, network
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    user.id, validatedPhone, validatedAmount, 
    validatedPayoutAmount, data.conversionRate, referenceCode, validatedNetwork
  )

  return db.prepare('SELECT * FROM conversion_requests WHERE id = ?').get(result.lastInsertRowid)
}

// Get conversion request by reference
export async function getConversionRequestByReference(reference: string) {
  return db.prepare(`
    SELECT cr.*, u.name as user_name
    FROM conversion_requests cr
    LEFT JOIN users u ON cr.user_id = u.id
    WHERE cr.reference_code = ?
  `).get(reference)
}

// Update conversion request
export async function updateConversionRequest(
  id: number,
  updates: {
    status?: string
    airtimeReceived?: boolean
    mpesaSent?: boolean
    mpesaTransactionId?: string
    completedAt?: Date
    notes?: string
  }
) {
  const fields = []
  const values = []

  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.airtimeReceived !== undefined) {
    fields.push('airtime_received = ?')
    values.push(updates.airtimeReceived ? 1 : 0)
  }
  if (updates.mpesaSent !== undefined) {
    fields.push('mpesa_sent = ?')
    values.push(updates.mpesaSent ? 1 : 0)
  }
  if (updates.mpesaTransactionId !== undefined) {
    fields.push('mpesa_transaction_id = ?')
    values.push(updates.mpesaTransactionId)
  }
  if (updates.completedAt !== undefined) {
    fields.push('completed_at = ?')
    values.push(updates.completedAt.toISOString())
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?')
    values.push(updates.notes)
  }

  if (fields.length === 0) return null

  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)

  const query = `UPDATE conversion_requests SET ${fields.join(', ')} WHERE id = ?`
  db.prepare(query).run(...values)

  return db.prepare('SELECT * FROM conversion_requests WHERE id = ?').get(id)
}

// Get system setting
export async function getSystemSetting(key: string) {
  const result = db.prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?').get(key) as any
  return result?.setting_value || null
}

// Record M-Pesa transaction
export async function recordMpesaTransaction(data: {
  conversionRequestId?: number
  transactionType: string
  mpesaReceiptNumber?: string
  phoneNumber: string
  amount: number
  transactionDate?: Date
  resultCode?: number
  resultDesc?: string
  status?: string
  network?: string
  rawResponse?: any
}) {
  const result = db.prepare(`
    INSERT INTO mpesa_transactions (
      conversion_request_id, transaction_type, mpesa_receipt_number,
      phone_number, amount, transaction_date, result_code, result_desc,
      status, network, raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.conversionRequestId || null, data.transactionType, 
    data.mpesaReceiptNumber || null, data.phoneNumber, data.amount,
    data.transactionDate?.toISOString() || null, data.resultCode || null, 
    data.resultDesc || null, data.status || "pending", 
    data.network || "safaricom", JSON.stringify(data.rawResponse || {})
  )

  return db.prepare('SELECT * FROM mpesa_transactions WHERE id = ?').get(result.lastInsertRowid)
}

// Alias for backward compatibility
export const recordMobileTransaction = recordMpesaTransaction
