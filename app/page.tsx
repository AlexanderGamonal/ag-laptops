import { Suspense } from 'react'
import StorefrontClient from '@/components/StorefrontClient'
import { getPublicLaptops } from '@/lib/store-data'
import { getStoreEmail, getWhatsAppNumber } from '@/lib/server-env'

// Revalida cada 60s. El import de Excel llama a revalidatePath('/') para invalidación inmediata.
export const revalidate = 60

export default async function StorePage() {
  const laptops = await getPublicLaptops()

  return (
    <Suspense>
      <StorefrontClient
        laptops={laptops}
        waNumber={getWhatsAppNumber()}
        storeEmail={getStoreEmail()}
      />
    </Suspense>
  )
}
