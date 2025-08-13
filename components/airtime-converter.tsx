"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Copy, Check, Phone, Wallet, Loader2, PhoneCall, ArrowRight } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

const schema = z.object({
  phone: z.string().min(10, "Enter a valid Kenyan number").max(13, "Enter a valid Kenyan number"),
  amount: z.coerce.number().min(20, "Minimum is KES 20").max(1000, "Maximum is KES 1,000"),
})

type FormValues = z.infer<typeof schema>

// Phone number validation for different networks
function validatePhoneForNetwork(phone: string, network: "safaricom" | "airtel"): boolean {
  const normalized = phone.replace(/\s/g, "")
  console.log(`Validating ${network} number: "${phone}" -> normalized: "${normalized}"`)
  
  if (network === "safaricom") {
    // Safaricom: All current prefixes (70, 71, 72, 74, 75, 76, 79, 01, 10, 11)
    // Also accepts international format 2547X, 2541X, 2540X, 2541X
    const isValid = /^(07[0-9]|01[0-9]|2547[0-9]|2541[0-9]|2540[0-9])\d{7}$/.test(normalized)
    console.log(`Safaricom validation result: ${isValid}`)
    return isValid
  } else {
    // Airtel: 073X, 078X, 25473X, 25478X
    const isValid = /^(073|078|25473|25478)\d{7}$/.test(normalized)
    console.log(`Airtel validation result: ${isValid}`)
    return isValid
  }
}

// Normalize phone number to international format
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\s/g, "")
  if (normalized.startsWith("0")) {
    normalized = "254" + normalized.substring(1)
  }
  if (!normalized.startsWith("254")) {
    normalized = "254" + normalized
  }
  return "+" + normalized
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function AirtimeBuyer() {
  const [activeTab, setActiveTab] = React.useState<"safaricom" | "airtel">("safaricom")
  const [showInstructions, setShowInstructions] = React.useState(false)
  const [copied, setCopied] = React.useState<"number" | "ussd" | null>(null)
  const [conversionData, setConversionData] = React.useState<any>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { toast } = useToast()

  const safaricomForm = useForm<FormValues>({
    resolver: zodResolver(
      schema.refine((data) => validatePhoneForNetwork(data.phone, "safaricom"), {
        message: "Enter a valid Safaricom number",
        path: ["phone"],
      }),
    ),
    defaultValues: { phone: "", amount: 0 },
    mode: "onChange",
  })

  const airtelForm = useForm<FormValues>({
    resolver: zodResolver(
      schema.refine((data) => validatePhoneForNetwork(data.phone, "airtel"), {
        message: "Enter a valid Airtel number",
        path: ["phone"],
      }),
    ),
    defaultValues: { phone: "", amount: 0 },
    mode: "onChange",
  })

  const currentForm = activeTab === "safaricom" ? safaricomForm : airtelForm
  const amount = currentForm.watch("amount") || 0

  // Different rates for different networks (what we pay users for their airtime)
  const rates = {
    safaricom: 0.75, // 75% - we pay KES 75 for KES 100 airtime
    airtel: 0.70, // 70% - we pay KES 70 for KES 100 airtime
  }

  const payout = Math.floor(amount * rates[activeTab])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/conversion/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: normalizePhone(values.phone),
          airtimeAmount: values.amount,
          network: activeTab,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setConversionData(result.data)
        setShowInstructions(true)
        toast({
          title: "Airtime Purchase Request Created",
          description: `Reference: ${result.data.reference}`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create airtime purchase request",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Conversion error:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function copy(text: string, type: "number" | "ussd") {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 1200)
      toast({
        title: "Copied to clipboard",
        description: text,
      })
    } catch {
      // ignore
    }
  }

  function openDialPad(ussdCode: string) {
    // Open phone dialer with USSD code
    window.location.href = `tel:${ussdCode}`
  }

  return (
    <>
      <div className="space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "safaricom" | "airtel")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="safaricom" className="flex items-center gap-2 text-sm font-medium">
              <Image src="/safaricom-logo-simple-green.png" alt="Safaricom" width={20} height={20} />
              Safaricom
            </TabsTrigger>
            <TabsTrigger value="airtel" className="flex items-center gap-2 text-sm font-medium">
              <Image src="/airtel-logo-red.png" alt="Airtel" width={20} height={20} />
              Airtel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="safaricom" className="space-y-6">
            <div className="text-center space-y-3">
              <Image
                src="/safaricom-logo-simple-green.png"
                alt="Safaricom"
                width={100}
                height={40}
                className="mx-auto"
              />
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-200">
                <span className="text-sm font-semibold">75% RATE</span>
                <span className="text-xs">Get KES 75 for KES 100 airtime</span>
              </div>
            </div>

            <form onSubmit={safaricomForm.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="safaricom-phone" className="text-base font-medium">
                  Your Safaricom Number
                </Label>
                <Input
                  id="safaricom-phone"
                  inputMode="tel"
                  placeholder="07XX XXX XXX"
                  className={cn(
                    "h-12 text-base rounded-lg border-green-300 focus:border-green-500 focus:ring-green-500",
                    safaricomForm.formState.errors.phone && "border-red-500 focus:border-red-500 focus:ring-red-500",
                  )}
                  {...safaricomForm.register("phone")}
                />
                {safaricomForm.formState.errors.phone && (
                  <p className="text-sm text-red-600">{safaricomForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="safaricom-amount" className="text-base font-medium">
                  Airtime Amount to Sell
                </Label>
                <Input
                  id="safaricom-amount"
                  type="number"
                  placeholder="Enter amount (20 - 1000)"
                  className={cn(
                    "h-12 text-base rounded-lg border-green-300 focus:border-green-500 focus:ring-green-500",
                    safaricomForm.formState.errors.amount && "border-red-500 focus:border-red-500 focus:ring-red-500",
                  )}
                  {...safaricomForm.register("amount", { valueAsNumber: true })}
                />
                {safaricomForm.formState.errors.amount && (
                  <p className="text-sm text-red-600">{safaricomForm.formState.errors.amount.message}</p>
                )}
              </div>

              {amount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-sm text-green-700 mb-2">You will receive:</div>
                  <div className="text-2xl font-bold text-green-800">
                    {formatCurrency(payout)} for {formatCurrency(amount)} airtime
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    We keep {formatCurrency(amount - payout)} as processing fee
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg font-medium rounded-lg" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Sell Safaricom Airtime
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="airtel" className="space-y-6">
            <div className="text-center space-y-3">
              <Image src="/airtel-logo-red.png" alt="Airtel" width={100} height={40} className="mx-auto" />
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full border border-red-200">
                <span className="text-sm font-semibold">70% RATE</span>
                <span className="text-xs">Get KES 70 for KES 100 airtime</span>
              </div>
            </div>

            <form onSubmit={airtelForm.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="airtel-phone" className="text-base font-medium">
                  Your Airtel Number
                </Label>
                <Input
                  id="airtel-phone"
                  inputMode="tel"
                  placeholder="073X XXX XXX or 078X XXX XXX"
                  className={cn(
                    "h-12 text-base rounded-lg border-red-300 focus:border-red-500 focus:ring-red-500",
                    airtelForm.formState.errors.phone && "border-red-500 focus:border-red-500 focus:ring-red-500",
                  )}
                  {...airtelForm.register("phone")}
                />
                {airtelForm.formState.errors.phone && (
                  <p className="text-sm text-red-600">{airtelForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="airtel-amount" className="text-base font-medium">
                  Airtime Amount to Sell
                </Label>
                <Input
                  id="airtel-amount"
                  type="number"
                  placeholder="Enter amount (20 - 1000)"
                  className={cn(
                    "h-12 text-base rounded-lg border-red-300 focus:border-red-500 focus:ring-red-500",
                    airtelForm.formState.errors.amount && "border-red-500 focus:border-red-500 focus:ring-red-500",
                  )}
                  {...airtelForm.register("amount", { valueAsNumber: true })}
                />
                {airtelForm.formState.errors.amount && (
                  <p className="text-sm text-red-600">{airtelForm.formState.errors.amount.message}</p>
                )}
              </div>

              {amount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-sm text-red-700 mb-2">You will receive:</div>
                  <div className="text-2xl font-bold text-red-800">
                    {formatCurrency(payout)} for {formatCurrency(amount)} airtime
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    We keep {formatCurrency(amount - payout)} as processing fee
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-lg font-medium rounded-lg" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Sell Airtel Airtime
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle
              className={cn(
                "flex items-center gap-2 text-lg",
                conversionData?.network === "safaricom" ? "text-green-700" : "text-red-700",
              )}
            >
              {conversionData?.network === "safaricom" ? (
                <Image src="/safaricom-logo-simple-green.png" alt="Safaricom" width={24} height={24} />
              ) : (
                <Image src="/airtel-logo-red.png" alt="Airtel" width={24} height={24} />
              )}
              Send Your Airtime
            </DialogTitle>
            <DialogDescription className="text-sm">
              Reference: <span className="font-mono font-medium">{conversionData?.reference}</span>
            </DialogDescription>
          </DialogHeader>

          {conversionData && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-gray-50">
                <div className="font-semibold flex items-center gap-2 text-gray-700 mb-2">
                  <Phone className="h-4 w-4" />
                  Step 1: Your Details
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Phone: {conversionData.phoneNumber}</div>
                  <div>Airtime: {formatCurrency(conversionData.airtimeAmount)}</div>
                  <div>You'll receive: {formatCurrency(conversionData.payoutAmount)}</div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="font-semibold flex items-center gap-2 mb-2">
                  <Wallet
                    className={cn(
                      "h-4 w-4",
                      conversionData.network === "safaricom" ? "text-green-700" : "text-red-700",
                    )}
                  />
                  Step 2: Send Airtime
                </div>
                <div className="mt-3 space-y-3">
                  <div className="text-sm text-gray-600">
                    Send exactly <span className="font-medium">{formatCurrency(conversionData.airtimeAmount)}</span>{" "}
                    {conversionData.network} airtime to us:
                  </div>
                  
                  {conversionData.network === "safaricom" ? (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <strong>USSD Code:</strong> 
                        <div className="font-mono bg-gray-100 p-2 rounded mt-1 text-center">
                          *140*{conversionData.airtimeAmount}*{conversionData.airtimeReceiveNumber}#
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openDialPad(`*140*${conversionData.airtimeAmount}*${conversionData.airtimeReceiveNumber}#`)}
                          className="flex-1 bg-green-600 hover:bg-green-700 h-10"
                        >
                          <PhoneCall className="mr-2 h-4 w-4" />
                          Open Dial Pad
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-10 w-10"
                          onClick={() => copy(`*140*${conversionData.airtimeAmount}*${conversionData.airtimeReceiveNumber}#`, "ussd")}
                        >
                          {copied === "ussd" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <strong>USSD Code:</strong>
                        <div className="font-mono bg-gray-100 p-2 rounded mt-1 text-center">
                          *432*{conversionData.airtimeAmount}*{conversionData.airtimeReceiveNumber}#
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openDialPad(`*432*${conversionData.airtimeAmount}*${conversionData.airtimeReceiveNumber}#`)}
                          className="flex-1 bg-red-600 hover:bg-red-700 h-10"
                        >
                          <PhoneCall className="mr-2 h-4 w-4" />
                          Open Dial Pad
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-10 w-10"
                          onClick={() => copy(`*432*${conversionData.airtimeAmount}*${conversionData.airtimeReceiveNumber}#`, "ussd")}
                        >
                          {copied === "ussd" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-blue-50">
                <div className="font-semibold text-blue-700 mb-2">Step 3: Receive Money</div>
                <p className="text-sm text-blue-600">
                  You&apos;ll receive{" "}
                  <span className="font-semibold">{formatCurrency(conversionData.payoutAmount)}</span> via{" "}
                  {conversionData.network === "safaricom" ? "M-Pesa" : "Airtel Money"} within 5 minutes after we receive
                  your airtime.
                </p>
              </div>

              <Separator />
              <div className="text-xs text-muted-foreground text-center">
                Keep this page open and track your conversion status with reference:{" "}
                <span className="font-mono font-medium">{conversionData.reference}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
