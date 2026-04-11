import type { Laptop } from '@/lib/supabase'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_FINDER =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

function slugifySegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function extractLaptopIdFromRouteParam(routeParam: string) {
  const value = routeParam.trim().replace(/^\/+|\/+$/g, '')

  if (UUID_PATTERN.test(value)) {
    return value
  }

  const foundId = value.match(UUID_FINDER)?.[0]
  return foundId && UUID_PATTERN.test(foundId) ? foundId : null
}

export function getLaptopSlug(laptop: Pick<Laptop, 'id' | 'marca' | 'numero_parte' | 'part_number'>) {
  const readableBits = [laptop.marca, laptop.numero_parte, laptop.part_number]
    .filter(Boolean)
    .map(value => slugifySegment(value as string))
    .filter(Boolean)

  return `${readableBits.join('-')}-${laptop.id}`
}

export function getLaptopHref(laptop: Pick<Laptop, 'id' | 'marca' | 'numero_parte' | 'part_number'>) {
  return `/laptop/${getLaptopSlug(laptop)}`
}
