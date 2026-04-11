import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { getSiteUrl, getStoreName } from '@/lib/server-env'

const inter = Inter({ subsets: ['latin'] })
const storeName = getStoreName()
const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${storeName} | Laptops nuevas y reacondicionadas`,
    template: `%s | ${storeName}`,
  },
  description: `Catálogo online de ${storeName} con laptops nuevas y reacondicionadas, precios finales con IGV y contacto directo por WhatsApp.`,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${storeName} | Laptops nuevas y reacondicionadas`,
    description: `Explora el catálogo de ${storeName} con precios finales, fichas claras y atención comercial directa.`,
    url: siteUrl,
    siteName: storeName,
    locale: 'es_PE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${storeName} | Laptops nuevas y reacondicionadas`,
    description: `Catálogo online con laptops publicadas, filtros útiles y contacto directo.`,
  },
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
