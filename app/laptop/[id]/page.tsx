import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Script from 'next/script'
import ProductDetailClient from '@/components/ProductDetailClient'
import { calcSellingPrice, formatSellingPrice } from '@/lib/pricing'
import { getPublicLaptopById } from '@/lib/store-data'
import { getSiteUrl, getStoreEmail, getStoreName, getWhatsAppNumber } from '@/lib/server-env'
import { extractLaptopIdFromRouteParam, getLaptopHref } from '@/lib/laptop-slug'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const laptopId = extractLaptopIdFromRouteParam(params.id)

  if (!laptopId) {
    return { title: `Producto no encontrado | ${getStoreName()}` }
  }

  const laptop = await getPublicLaptopById(laptopId)
  const storeName = getStoreName()

  if (!laptop) {
    return { title: `Producto no encontrado | ${storeName}` }
  }

  const title = `${laptop.marca ? `${laptop.marca} ` : ''}${laptop.numero_parte} | ${storeName}`
  const description = `${laptop.descripcion || 'Laptop disponible en catálogo'} · ${formatSellingPrice(laptop.precio, laptop)}`
  const image = laptop.foto_1 || laptop.foto_2 || laptop.foto_3 || undefined
  const url = `${getSiteUrl()}${getLaptopHref(laptop)}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: image ? [{ url: image, alt: laptop.numero_parte }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function LaptopDetailPage({ params }: { params: { id: string } }) {
  const laptopId = extractLaptopIdFromRouteParam(params.id)

  if (!laptopId) {
    notFound()
  }

  const laptop = await getPublicLaptopById(laptopId)

  if (!laptop) {
    notFound()
  }

  const canonicalHref = getLaptopHref(laptop)
  if (params.id !== canonicalHref.split('/').pop()) {
    redirect(canonicalHref)
  }

  const sellingPrice = laptop.precio ? calcSellingPrice(laptop.precio, laptop) : null
  const image = laptop.foto_1 || laptop.foto_2 || laptop.foto_3
  const url = `${getSiteUrl()}${getLaptopHref(laptop)}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: laptop.descripcion || laptop.numero_parte,
    description: laptop.descripcion || undefined,
    image: image ? [image] : undefined,
    brand: laptop.marca ? { '@type': 'Brand', name: laptop.marca } : undefined,
    sku: laptop.numero_parte,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'PEN',
      price: sellingPrice ?? undefined,
      availability:
        laptop.estado?.toLowerCase().includes('stock')
          ? 'https://schema.org/InStock'
          : 'https://schema.org/PreOrder',
      itemCondition:
        laptop.condicion?.toLowerCase() === 'nuevo'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/RefurbishedCondition',
    },
  }

  return (
    <>
      <Script
        id="product-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient
        laptop={laptop}
        whatsappNumber={getWhatsAppNumber()}
        contactEmail={getStoreEmail()}
      />
    </>
  )
}
