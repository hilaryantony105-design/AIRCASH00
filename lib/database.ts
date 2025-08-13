// Use SQLite for now (works both locally and on Vercel)
// Easy to deploy and test, can switch to PostgreSQL later if needed
import * as SQLiteDB from './database-sqlite'

console.log('🗄️ Using SQLite database')

// Re-export all functions from SQLite implementation
export const createOrGetUser = SQLiteDB.createOrGetUser
export const generateReferenceCode = SQLiteDB.generateReferenceCode
export const createConversionRequest = SQLiteDB.createConversionRequest
export const updateConversionRequest = SQLiteDB.updateConversionRequest
export const getConversionRequestByReference = SQLiteDB.getConversionRequestByReference
export const recordMpesaTransaction = SQLiteDB.recordMpesaTransaction
export const getSystemSetting = SQLiteDB.getSystemSetting
export const recordMobileTransaction = SQLiteDB.recordMobileTransaction
