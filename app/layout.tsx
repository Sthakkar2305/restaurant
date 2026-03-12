import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Restaurant POS - Order Management System',
  description: 'Fast and efficient restaurant ordering system for waiters and admin with real-time order tracking, QR payment, and PDF invoices.',
  generator: 'v0.app',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: [
      {
        url: '/app-starter.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/app-starter.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/app-starter.png',
        type: 'image/png',
      },
    ],
    apple: '/apple-app-starter.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
