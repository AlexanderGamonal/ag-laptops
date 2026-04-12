import type { MetadataRoute } from 'next'
import { getPublicLaptops } from '@/lib/store-data'
import { getLaptopHref } from '@/lib/laptop-slug'
import { getSiteUrl } from '@/lib/server-env'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const laptops = await getPublicLaptops()

  const laptopEntries: MetadataRoute.Sitemap = laptops.map((laptop) => ({
    url: `${siteUrl}${getLaptopHref(laptop)}`,
    lastModified: laptop.updated_at ? new Date(laptop.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...laptopEntries,
  ]
}
