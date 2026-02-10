-- Drop the old unique index on (package_id, service_id) so the same service can appear
-- both as a standalone package service and inside a service group.
DROP INDEX IF EXISTS "package_services_package_id_service_id_key";
