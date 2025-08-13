#!/usr/bin/env node

/**
 * Quick Setup Script for AirCash Pro Deployment
 * Run with: node scripts/deploy-setup.js
 */

console.log('🚀 AirCash Pro - Quick Setup for Real Device Testing\n')

const steps = [
  {
    step: 1,
    title: 'Set up FREE PostgreSQL Database',
    description: 'Get a free database for production',
    actions: [
      '• Go to https://neon.tech',
      '• Sign up with GitHub',
      '• Create project: "aircash-pro"',
      '• Copy connection string',
      '• Update .env.local with DATABASE_URL'
    ]
  },
  {
    step: 2,
    title: 'Get M-Pesa Sandbox Credentials',
    description: 'Free testing credentials from Safaricom',
    actions: [
      '• Go to https://developer.safaricom.co.ke',
      '• Create account and new app',
      '• Subscribe to: C2B, B2C, M-Pesa Express',
      '• Copy Consumer Key & Consumer Secret',
      '• Update .env.local with M-Pesa credentials'
    ]
  },
  {
    step: 3,
    title: 'Deploy to Vercel (FREE)',
    description: 'Get your app online in 2 minutes',
    actions: [
      '• Push code to GitHub',
      '• Go to https://vercel.com',
      '• Import your repository',
      '• Add all environment variables',
      '• Deploy!'
    ]
  },
  {
    step: 4,
    title: 'Configure Webhooks',
    description: 'Tell M-Pesa where to send notifications',
    actions: [
      '• In Safaricom Developer Portal',
      '• Set Confirmation URL: https://your-domain.vercel.app/api/mpesa/c2b/confirmation',
      '• Set Validation URL: https://your-domain.vercel.app/api/mpesa/c2b/validation'
    ]
  },
  {
    step: 5,
    title: 'Test on Real Device! 📱',
    description: 'The moment of truth',
    actions: [
      '• Visit your deployed URL on phone',
      '• Enter your phone number & KES 20',
      '• Click "Open Dial Pad" button',
      '• Dial the USSD code (*140*20*174379#)',
      '• Wait for automatic money back!'
    ]
  }
]

steps.forEach(({ step, title, description, actions }) => {
  console.log(`📋 Step ${step}: ${title}`)
  console.log(`   ${description}`)
  actions.forEach(action => console.log(`   ${action}`))
  console.log('')
})

console.log('⚡ QUICK START COMMANDS:')
console.log('   npm install')
console.log('   npm run dev')
console.log('   git init && git add . && git commit -m "Initial commit"')
console.log('   # Push to GitHub, then deploy on Vercel')
console.log('')

console.log('🔗 Helpful Links:')
console.log('   • Free Database: https://neon.tech')
console.log('   • M-Pesa Dev Portal: https://developer.safaricom.co.ke')
console.log('   • Free Hosting: https://vercel.com')
console.log('   • Airtel Dev Portal: https://developers.airtel.africa')
console.log('')

console.log('💡 Pro Tips:')
console.log('   • Start with small amounts (KES 20) for testing')
console.log('   • Monitor transactions in /admin dashboard')
console.log('   • Check webhook logs in Vercel dashboard')
console.log('   • Use sandbox/staging APIs for testing')
console.log('')

console.log('🎉 Once deployed, your system will:')
console.log('   ✅ Accept real airtime from customers')
console.log('   ✅ Automatically send money back via M-Pesa')
console.log('   ✅ Work on any mobile device browser')
console.log('   ✅ Handle multiple simultaneous transactions')
console.log('   ✅ Provide admin dashboard for monitoring')
console.log('')

console.log('❓ Need help? Check DEPLOYMENT.md for detailed instructions!')
