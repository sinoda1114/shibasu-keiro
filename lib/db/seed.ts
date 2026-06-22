import { db } from './client'
import { providers } from './schema'

async function seed() {
  await db.insert(providers).values({
    id: 'nagoya_city_bus',
    name: 'nagoya_city_bus',
    displayName: '名古屋市バス',
    areaName: '名古屋市',
    gtfsSourceUrl: null,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).onConflictDoNothing()
  console.log('Seed completed.')
  process.exit(0)
}

seed().catch(console.error)
