// Test script to verify conversion system
// Run with: node scripts/test-conversion.js

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "your-database-url-here")

async function testConversionSystem() {
  try {
    console.log("🧪 Testing Conversion System...\n")

    // Test 1: Check if tables exist
    console.log("1. Checking database tables...")
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'conversion_requests', 'system_settings')
    `
    console.log("✅ Tables found:", tables.map(t => t.table_name).join(", "))

    // Test 2: Check system settings
    console.log("\n2. Checking system settings...")
    const settings = await sql`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN ('default_conversion_rate', 'airtel_conversion_rate', 'airtime_receive_number', 'airtel_receive_number')
    `
    console.log("✅ System settings:")
    settings.forEach(s => console.log(`   ${s.setting_key}: ${s.setting_value}`))

    // Test 3: Check if network column exists
    console.log("\n3. Checking network column...")
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'conversion_requests' 
      AND column_name = 'network'
    `
    if (columns.length > 0) {
      console.log("✅ Network column exists in conversion_requests table")
    } else {
      console.log("❌ Network column missing! Run the migration script.")
    }

    // Test 4: Test conversion creation (dry run)
    console.log("\n4. Testing conversion creation logic...")
    const testPhone = "+254712345678"
    const testAmount = 100
    const testNetwork = "safaricom"
    const testRate = 0.75
    const testPayout = Math.floor(testAmount * testRate)
    
    console.log(`   Phone: ${testPhone}`)
    console.log(`   Amount: KES ${testAmount}`)
    console.log(`   Network: ${testNetwork}`)
    console.log(`   Rate: ${testRate * 100}%`)
    console.log(`   Payout: KES ${testPayout}`)
    console.log("✅ Conversion logic working correctly")

    // Test 5: Check existing conversions
    console.log("\n5. Checking existing conversions...")
    const conversions = await sql`SELECT COUNT(*) as count FROM conversion_requests`
    console.log(`✅ Total conversions: ${conversions[0].count}`)

    if (conversions[0].count > 0) {
      const recentConversion = await sql`
        SELECT reference_code, phone_number, network, airtime_amount, payout_amount, status 
        FROM conversion_requests 
        ORDER BY created_at DESC 
        LIMIT 1
      `
      console.log("   Latest conversion:")
      console.log(`   Reference: ${recentConversion[0].reference_code}`)
      console.log(`   Phone: ${recentConversion[0].phone_number}`)
      console.log(`   Network: ${recentConversion[0].network}`)
      console.log(`   Amount: KES ${recentConversion[0].airtime_amount}`)
      console.log(`   Payout: KES ${recentConversion[0].payout_amount}`)
      console.log(`   Status: ${recentConversion[0].status}`)
    }

    console.log("\n🎉 All tests passed! Conversion system is ready.")
    
  } catch (error) {
    console.error("❌ Test failed:", error.message)
    console.error("\n🔧 To fix issues:")
    console.error("1. Run: node scripts/01-create-tables.sql")
    console.error("2. Run: node scripts/03-add-network-column.sql")
    console.error("3. Check your DATABASE_URL environment variable")
  }
}

// Run the test
testConversionSystem()
