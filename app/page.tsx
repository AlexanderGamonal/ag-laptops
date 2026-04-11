import StorefrontClient from '@/components/StorefrontClient'
import { getPublicLaptops } from '@/lib/store-data'
import { getStoreEmail, getWhatsAppNumber } from '@/lib/server-env'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StorePage() {
  const laptops = await getPublicLaptops()

  return (
    <StorefrontClient
      laptops={laptops}
      waNumber={getWhatsAppNumber()}
      storeEmail={getStoreEmail()}
    />
  )
}
