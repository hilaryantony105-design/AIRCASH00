"use client"

import { Button } from "@/components/ui/button"
import { Phone, Wallet, ArrowRight, CreditCard, Smartphone, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import AirtimeBuyer from "./airtime-converter"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function WelcomeScreen() {
  const [showSellModal, setShowSellModal] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false)

  return (
    <>
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-purple-900">
            AirCash Pro
          </h1>
          <p className="text-xl text-purple-700 max-w-2xl mx-auto">
            Sell your airtime for instant cash. Get up to 75% value for Safaricom and 70% for Airtel airtime.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 max-w-lg mx-auto">
          <div className="rounded-lg border bg-white p-4 text-center">
            <div className="text-2xl font-bold text-green-600">75%</div>
            <div className="text-sm text-gray-600">Safaricom Rate</div>
            <div className="text-xs text-gray-500">KES 75 for KES 100 airtime</div>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <div className="text-2xl font-bold text-red-600">70%</div>
            <div className="text-sm text-gray-600">Airtel Rate</div>
            <div className="text-xs text-gray-500">KES 70 for KES 100 airtime</div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-purple-800">What would you like to do?</h2>
          
          <div className="grid gap-4 max-w-md mx-auto">
            <Button 
              size="lg" 
              className="w-full bg-purple-600 hover:bg-purple-700 h-16 text-lg"
              onClick={() => setShowSellModal(true)}
            >
              <Smartphone className="mr-3 h-6 w-6" />
              Sell Your Airtime
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full h-16 text-lg border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => setShowBuyModal(true)}
            >
              <CreditCard className="mr-3 h-6 w-6" />
              Buy Airtime
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>

            <Button 
              size="lg" 
              variant="outline" 
              className="w-full h-16 text-lg border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => setShowSendMoneyModal(true)}
            >
              <Wallet className="mr-3 h-6 w-6" />
              Send Money
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-2 max-w-2xl mx-auto">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Instant cash via M-Pesa/Airtel Money</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>No hidden fees or charges</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Safe and secure transactions</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>24/7 service available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sell Airtime Modal */}
      <Dialog open={showSellModal} onOpenChange={setShowSellModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-900 text-center">
              Sell Your Airtime for Cash
            </DialogTitle>
          </DialogHeader>
          <AirtimeBuyer />
        </DialogContent>
      </Dialog>

      {/* Buy Airtime Modal */}
      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-green-900 text-center">
              Buy Airtime
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <div className="mb-6">
              <CreditCard className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Buy Airtime for Any Number</h3>
              <p className="text-gray-600">Purchase airtime for yourself or send to friends and family</p>
            </div>
            
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Features:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Buy for any Safaricom or Airtel number</li>
                  <li>• Instant delivery via USSD</li>
                  <li>• Competitive rates</li>
                  <li>• 24/7 availability</li>
                </ul>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">This feature will be implemented soon</p>
                <Button 
                  variant="outline" 
                  onClick={() => setShowBuyModal(false)}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Money Modal */}
      <Dialog open={showSendMoneyModal} onOpenChange={setShowSendMoneyModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-900 text-center">
              Send Money
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <div className="mb-6">
              <Wallet className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Send Money to Anyone</h3>
              <p className="text-gray-600">Transfer money instantly via M-Pesa or Airtel Money</p>
            </div>
            
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Features:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Send to any phone number</li>
                  <li>• Instant transfers</li>
                  <li>• Low transaction fees</li>
                  <li>• Secure and reliable</li>
                </ul>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">This feature will be implemented soon</p>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSendMoneyModal(false)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
