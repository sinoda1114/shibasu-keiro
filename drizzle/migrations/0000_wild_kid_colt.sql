CREATE TABLE `bus_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`gtfs_version_id` text NOT NULL,
	`route_id` text NOT NULL,
	`route_short_name` text,
	`route_long_name` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bus_stop_times` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`gtfs_version_id` text NOT NULL,
	`trip_id` text NOT NULL,
	`stop_id` text NOT NULL,
	`arrival_time_seconds` integer,
	`departure_time_seconds` integer,
	`stop_sequence` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bus_stop_times_stop_dep` ON `bus_stop_times` (`provider_id`,`stop_id`,`departure_time_seconds`);--> statement-breakpoint
CREATE INDEX `idx_bus_stop_times_trip_seq` ON `bus_stop_times` (`provider_id`,`trip_id`,`stop_sequence`);--> statement-breakpoint
CREATE TABLE `bus_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`gtfs_version_id` text NOT NULL,
	`stop_id` text NOT NULL,
	`stop_name` text NOT NULL,
	`stop_lat` real,
	`stop_lon` real,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bus_stops_provider_name` ON `bus_stops` (`provider_id`,`stop_name`);--> statement-breakpoint
CREATE INDEX `idx_bus_stops_provider_stop` ON `bus_stops` (`provider_id`,`stop_id`,`gtfs_version_id`);--> statement-breakpoint
CREATE TABLE `bus_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`gtfs_version_id` text NOT NULL,
	`trip_id` text NOT NULL,
	`route_id` text NOT NULL,
	`service_id` text NOT NULL,
	`trip_headsign` text,
	`direction_id` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bus_trips_provider_trip` ON `bus_trips` (`provider_id`,`trip_id`,`gtfs_version_id`);--> statement-breakpoint
CREATE INDEX `idx_bus_trips_provider_service` ON `bus_trips` (`provider_id`,`service_id`);--> statement-breakpoint
CREATE TABLE `gtfs_calendar` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`gtfs_version_id` text NOT NULL,
	`service_id` text NOT NULL,
	`monday` integer NOT NULL,
	`tuesday` integer NOT NULL,
	`wednesday` integer NOT NULL,
	`thursday` integer NOT NULL,
	`friday` integer NOT NULL,
	`saturday` integer NOT NULL,
	`sunday` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gtfs_calendar_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`gtfs_version_id` text NOT NULL,
	`service_id` text NOT NULL,
	`date` text NOT NULL,
	`exception_type` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gtfs_import_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`gtfs_version_id` text,
	`status` text NOT NULL,
	`started_at` text,
	`finished_at` text,
	`error_message` text,
	`source_url` text NOT NULL,
	`source_hash` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gtfs_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`version_name` text NOT NULL,
	`source_url` text NOT NULL,
	`source_hash` text,
	`imported_at` text,
	`valid_from` text,
	`valid_to` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`area_name` text NOT NULL,
	`gtfs_source_url` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
