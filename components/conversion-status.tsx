"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AirtimeSaleStatus {
  reference: string
  status: string
  phoneNumber: string
  airtimeAmount: number
  payoutAmount: number
  airtimeReceived: boolean
  mpesaSent: boolean
  mpesaTransactionId?: string
  createdAt: string
  completedAt?: string
}

export default function AirtimeSaleStatus() {
  const [reference, setReference] = useState("")
  const [status, setStatus] = useState<AirtimeSaleStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const checkStatus = async () => {
    if (!reference.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reference code",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/conversion/status/${reference.trim()}`)
      const result = await response.json()

      if (result.success) {
        setStatus(result.data)
        toast({
          title: "Status Found",
          description: `Sale status: ${result.data.status}`,
        })
      } else {
        setStatus(null)
        toast({
          title: "Not Found",
          description: result.error || "Airtime sale not found",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "failed":
        return "bg-red-100 text-red-800 border-red-200"
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Check Sale Status
        </CardTitle>
        <CardDescription>
          Enter your reference code to check the status of your airtime sale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reference">Reference Code</Label>
          <div className="flex gap-2">
            <Input
              id="reference"
              placeholder="AC-ABC123-XYZ"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && checkStatus()}
            />
            <Button onClick={checkStatus} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
            </Button>
          </div>
        </div>

        {status && (
          <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge className={`${getStatusColor(status.status)}`}>
                {getStatusIcon(status.status)}
                <span className="ml-1 capitalize">{status.status}</span>
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Reference:</span>
                <div className="font-mono text-xs">{status.reference}</div>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <div>{status.phoneNumber}</div>
              </div>
              <div>
                <span className="text-gray-600">Airtime Sold:</span>
                <div>KES {status.airtimeAmount}</div>
              </div>
              <div>
                <span className="text-gray-600">Cash Received:</span>
                <div>KES {status.payoutAmount}</div>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Airtime Received:</span>
                {status.airtimeReceived ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Money Sent:</span>
                {status.mpesaSent ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
              </div>
            </div>

            {status.mpesaTransactionId && (
              <div className="text-sm">
                <span className="text-gray-600">Transaction ID:</span>
                <div className="font-mono text-xs">{status.mpesaTransactionId}</div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Created: {new Date(status.createdAt).toLocaleString()}
              {status.completedAt && (
                <div>Completed: {new Date(status.completedAt).toLocaleString()}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
