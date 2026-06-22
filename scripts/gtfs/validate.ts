import { eq } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import { busStops, busStopTimes } from '../../lib/db/schema'

/**
 * 取込後の最低限の検証
 */
export async function validateImport(gtfsVersionId: string): Promise<boolean> {
  // stops 存在確認
  const stops = await db
    .select()
    .from(busStops)
    .where(eq(busStops.gtfsVersionId, gtfsVersionId))
    .limit(1)

  if (stops.length === 0) {
    console.error('VALIDATION FAILED: no stops found')
    return false
  }

  // stop_times 存在確認
  const stopTimes = await db
    .select()
    .from(busStopTimes)
    .where(eq(busStopTimes.gtfsVersionId, gtfsVersionId))
    .limit(1)

  if (stopTimes.length === 0) {
    console.error('VALIDATION FAILED: no stop_times found')
    return false
  }

  console.log('✓ Validation passed')
  return true
}
