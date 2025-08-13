import { type NextRequest, NextResponse } from "next/server"
import Database from 'better-sqlite3'
import path from 'path'

// Get database connection
const dbPath = path.join(process.cwd(), 'aircash.db')
const db = new Database(dbPath)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status")
    const network = searchParams.get("network")

    let whereClause = "WHERE 1=1"
    const params: any[] = []

    if (status && status !== "all") {
      whereClause += ` AND cr.status = ?`
      params.push(status)
    }

    if (network && network !== "all") {
      whereClause += ` AND cr.network = ?`
      params.push(network)
    }

    // Add limit and offset parameters
    params.push(limit, offset)

    const query = `
      SELECT 
        cr.id,
        cr.reference_code,
        cr.phone_number,
        cr.network,
        cr.airtime_amount,
        cr.payout_amount,
        cr.conversion_rate,
        cr.status,
        cr.airtime_received,
        cr.mpesa_sent,
        cr.mpesa_transaction_id,
        cr.created_at,
        cr.completed_at,
        cr.notes,
        u.name as user_name
      FROM conversion_requests cr
      LEFT JOIN users u ON cr.user_id = u.id
      ${whereClause}
      ORDER BY cr.created_at DESC
      LIMIT ? OFFSET ?
    `

    const conversions = db.prepare(query).all(...params)

    const formattedConversions = conversions.map((conversion: any) => ({
      id: conversion.id,
      referenceCode: conversion.reference_code,
      phoneNumber: conversion.phone_number,
      network: conversion.network,
      airtimeAmount: conversion.airtime_amount,
      payoutAmount: conversion.payout_amount,
      conversionRate: Number.parseFloat(conversion.conversion_rate || '0'),
      status: conversion.status,
      airtimeReceived: conversion.airtime_received,
      mpesaSent: conversion.mpesa_sent,
      mpesaTransactionId: conversion.mpesa_transaction_id,
      createdAt: conversion.created_at,
      completedAt: conversion.completed_at,
      notes: conversion.notes,
      userName: conversion.user_name,
    }))

    return NextResponse.json({ success: true, data: formattedConversions })
  } catch (error) {
    console.error("Admin conversions error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
