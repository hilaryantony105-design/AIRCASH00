// Script to register C2B URLs with Safaricom
// Run this once after setting up your environment variables
// Usage: node scripts/register-c2b-urls.js

import { registerC2BUrls } from '../lib/mpesa.js'

async function main() {
  try {
    console.log('Registering C2B URLs with Safaricom...')
    
    const result = await registerC2BUrls()
    
    if (result.ResponseCode === "0") {
      console.log('✅ C2B URLs registered successfully!')
      console.log('Result:', result)
    } else {
      console.error('❌ Failed to register C2B URLs:', result)
    }
  } catch (error) {
    console.error('❌ Error registering C2B URLs:', error)
  }
}

main()
