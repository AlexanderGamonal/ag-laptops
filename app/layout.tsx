import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
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
  other: {
    'facebook-domain-verification': '9qg2orkrxz8o02m0jywlrtm96c42vm',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','1188161503325431');
          fbq('track','PageView');
        `}</Script>
        <noscript>
          <img height="1" width="1" style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1188161503325431&ev=PageView&noscript=1"
          />
        </noscript>
      </body>
    </html>
  )
}
