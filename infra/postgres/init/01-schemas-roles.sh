#!/bin/bash
# One Postgres cluster, one database, schema-per-service, one role per schema.
# Each service's Prisma client connects with its own role and only ever sees
# its own schema -- a cross-service join is a permissions error, not a code
# review convention. See ARCHITECTURE.md "Data ownership" for the rationale.
#
# .sh (not .sql) specifically so the per-role passwords can come from the
# environment instead of being hardcoded -- Postgres's docker-entrypoint
# sources every *.sh file in this directory with the container's env already
# in scope, so ${IDENTITY_RW_PASSWORD} etc. below are real bash variable
# expansion, not a templating step bolted on separately. Set real values via
# infra/.env in any deployment that isn't purely local dev; the fallbacks
# here match what local dev has always used.
set -e

IDENTITY_RW_PASSWORD="${IDENTITY_RW_PASSWORD:-identity_rw_pw}"
CATALOG_RW_PASSWORD="${CATALOG_RW_PASSWORD:-catalog_rw_pw}"
ASSESSMENT_RW_PASSWORD="${ASSESSMENT_RW_PASSWORD:-assessment_rw_pw}"
ANALYTICS_RW_PASSWORD="${ANALYTICS_RW_PASSWORD:-analytics_rw_pw}"
NOTIFICATION_RW_PASSWORD="${NOTIFICATION_RW_PASSWORD:-notification_rw_pw}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE SCHEMA IF NOT EXISTS identity;
  CREATE SCHEMA IF NOT EXISTS catalog;
  CREATE SCHEMA IF NOT EXISTS assessment;
  CREATE SCHEMA IF NOT EXISTS analytics;
  CREATE SCHEMA IF NOT EXISTS notification;

  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'identity_rw') THEN
      CREATE ROLE identity_rw LOGIN PASSWORD '${IDENTITY_RW_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'catalog_rw') THEN
      CREATE ROLE catalog_rw LOGIN PASSWORD '${CATALOG_RW_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'assessment_rw') THEN
      CREATE ROLE assessment_rw LOGIN PASSWORD '${ASSESSMENT_RW_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'analytics_rw') THEN
      CREATE ROLE analytics_rw LOGIN PASSWORD '${ANALYTICS_RW_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'notification_rw') THEN
      CREATE ROLE notification_rw LOGIN PASSWORD '${NOTIFICATION_RW_PASSWORD}';
    END IF;
  END
  \$\$;

  ALTER SCHEMA identity     OWNER TO identity_rw;
  ALTER SCHEMA catalog      OWNER TO catalog_rw;
  ALTER SCHEMA assessment   OWNER TO assessment_rw;
  ALTER SCHEMA analytics    OWNER TO analytics_rw;
  ALTER SCHEMA notification OWNER TO notification_rw;

  -- Explicit revoke-then-grant: a cross-service join must fail with a
  -- permissions error, not merely "no one happened to write that query yet".
  REVOKE ALL ON SCHEMA identity     FROM PUBLIC;
  REVOKE ALL ON SCHEMA catalog      FROM PUBLIC;
  REVOKE ALL ON SCHEMA assessment   FROM PUBLIC;
  REVOKE ALL ON SCHEMA analytics    FROM PUBLIC;
  REVOKE ALL ON SCHEMA notification FROM PUBLIC;

  GRANT ALL ON SCHEMA identity     TO identity_rw;
  GRANT ALL ON SCHEMA catalog      TO catalog_rw;
  GRANT ALL ON SCHEMA assessment   TO assessment_rw;
  GRANT ALL ON SCHEMA analytics    TO analytics_rw;
  GRANT ALL ON SCHEMA notification TO notification_rw;

  ALTER ROLE identity_rw     SET search_path = identity;
  ALTER ROLE catalog_rw      SET search_path = catalog;
  ALTER ROLE assessment_rw   SET search_path = assessment;
  ALTER ROLE analytics_rw    SET search_path = analytics;
  ALTER ROLE notification_rw SET search_path = notification;

  -- Default privileges so tables created by Prisma migrations later are also
  -- owned/grantable correctly without a manual GRANT per migration.
  ALTER DEFAULT PRIVILEGES FOR ROLE identity_rw IN SCHEMA identity
    GRANT ALL ON TABLES TO identity_rw;
  ALTER DEFAULT PRIVILEGES FOR ROLE catalog_rw IN SCHEMA catalog
    GRANT ALL ON TABLES TO catalog_rw;
  ALTER DEFAULT PRIVILEGES FOR ROLE assessment_rw IN SCHEMA assessment
    GRANT ALL ON TABLES TO assessment_rw;
  ALTER DEFAULT PRIVILEGES FOR ROLE analytics_rw IN SCHEMA analytics
    GRANT ALL ON TABLES TO analytics_rw;
  ALTER DEFAULT PRIVILEGES FOR ROLE notification_rw IN SCHEMA notification
    GRANT ALL ON TABLES TO notification_rw;
EOSQL
