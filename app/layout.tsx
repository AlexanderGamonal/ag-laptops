import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'TechLaptops'

export const metadata: Metadata = {
  title: storeName,
  description: `Tienda de laptops - ${storeName}`,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
