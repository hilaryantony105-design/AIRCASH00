"use client"
import { Phone } from "lucide-react"
import Link from "next/link"
import WelcomeScreen from "@/components/welcome-screen"
import ClientWrapper from "@/components/client-wrapper"

export default function Page() {
  return (
    <ClientWrapper>
      <main className="min-h-dvh w-full bg-gradient-to-b from-purple-50 via-white to-purple-50">
        {/* Demo Notice */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <p className="text-sm text-yellow-800">
            🚧 <strong>Demo Mode:</strong> This is a static demo version. For full functionality, deploy with server-side API support.
          </p>
        </div>

        <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-purple-600 text-white grid place-items-center font-bold">A</div>
              <span className="text-lg font-semibold text-purple-700">AirCash Pro</span>
            </Link>
            <a
              href="tel:+254797545416"
              className="text-sm font-medium text-purple-700 hover:text-purple-800 flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              +254 797 545 416
            </a>
          </div>
        </header>

        <section className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-xl">
            <WelcomeScreen />
          </div>
        </section>
      </main>
    </ClientWrapper>
  )
}
