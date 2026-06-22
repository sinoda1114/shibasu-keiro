import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'

// providers
export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  areaName: text('area_name').notNull(),
  gtfsSourceUrl: text('gtfs_source_url'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// gtfs_versions
export const gtfsVersions = sqliteTable('gtfs_versions', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull().references(() => providers.id),
  versionName: text('version_name').notNull(),
  sourceUrl: text('source_url').notNull(),
  sourceHash: text('source_hash'),
  importedAt: text('imported_at'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull(), // "staging" | "active" | "archived" | "failed"
  createdAt: text('created_at').notNull(),
})

// gtfs_import_jobs
export const gtfsImportJobs = sqliteTable('gtfs_import_jobs', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  gtfsVersionId: text('gtfs_version_id'),
  status: text('status').notNull(), // "pending" | "running" | "completed" | "failed"
  startedAt: text('started_at'),
  finishedAt: text('finished_at'),
  errorMessage: text('error_message'),
  sourceUrl: text('source_url').notNull(),
  sourceHash: text('source_hash'),
  createdAt: text('created_at').notNull(),
})

// bus_stops
export const busStops = sqliteTable('bus_stops', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  gtfsVersionId: text('gtfs_version_id').notNull(),
  stopId: text('stop_id').notNull(),
  stopName: text('stop_name').notNull(),
  stopLat: real('stop_lat'),
  stopLon: real('stop_lon'),
  createdAt: text('created_at').notNull(),
}, (t) => [
  index('idx_bus_stops_provider_name').on(t.providerId, t.stopName),
  index('idx_bus_stops_provider_stop').on(t.providerId, t.stopId, t.gtfsVersionId),
])

// bus_routes
export const busRoutes = sqliteTable('bus_routes', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  gtfsVersionId: text('gtfs_version_id').notNull(),
  routeId: text('route_id').notNull(),
  routeShortName: text('route_short_name'),
  routeLongName: text('route_long_name'),
  createdAt: text('created_at').notNull(),
})

// bus_trips
export const busTrips = sqliteTable('bus_trips', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  gtfsVersionId: text('gtfs_version_id').notNull(),
  tripId: text('trip_id').notNull(),
  routeId: text('route_id').notNull(),
  serviceId: text('service_id').notNull(),
  tripHeadsign: text('trip_headsign'),
  directionId: integer('direction_id'),
  createdAt: text('created_at').notNull(),
}, (t) => [
  index('idx_bus_trips_provider_trip').on(t.providerId, t.tripId, t.gtfsVersionId),
  index('idx_bus_trips_provider_service').on(t.providerId, t.serviceId),
])

// bus_stop_times（時刻は秒int: "25:30:00" → 91800）
export const busStopTimes = sqliteTable('bus_stop_times', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  gtfsVersionId: text('gtfs_version_id').notNull(),
  tripId: text('trip_id').notNull(),
  stopId: text('stop_id').notNull(),
  arrivalTimeSeconds: integer('arrival_time_seconds'),
  departureTimeSeconds: integer('departure_time_seconds'),
  stopSequence: integer('stop_sequence').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => [
  index('idx_bus_stop_times_stop_dep').on(t.providerId, t.stopId, t.departureTimeSeconds),
  index('idx_bus_stop_times_trip_seq').on(t.providerId, t.tripId, t.stopSequence),
])

// gtfs_calendar (raw)
export const gtfsCalendar = sqliteTable('gtfs_calendar', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  gtfsVersionId: text('gtfs_version_id').notNull(),
  serviceId: text('service_id').notNull(),
  monday: integer('monday').notNull(),
  tuesday: integer('tuesday').notNull(),
  wednesday: integer('wednesday').notNull(),
  thursday: integer('thursday').notNull(),
  friday: integer('friday').notNull(),
  saturday: integer('saturday').notNull(),
  sunday: integer('sunday').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
})

// gtfs_calendar_dates (raw) — 祝日・特別日の例外
export const gtfsCalendarDates = sqliteTable('gtfs_calendar_dates', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  gtfsVersionId: text('gtfs_version_id').notNull(),
  serviceId: text('service_id').notNull(),
  date: text('date').notNull(), // YYYYMMDD
  exceptionType: integer('exception_type').notNull(), // 1=追加, 2=削除
})
