-- Phase 1a: Add enum types first (must be committed before use)

-- 1. Create organization type enum
DO $$ BEGIN
  CREATE TYPE organization_type AS ENUM ('CANDIDATE_ORG', 'EMPLOYER', 'AGENCY', 'RECRUITING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Extend app_role enum with new company roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'hiring_manager') THEN
    ALTER TYPE app_role ADD VALUE 'hiring_manager';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'recruiter') THEN
    ALTER TYPE app_role ADD VALUE 'recruiter';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'agency_admin') THEN
    ALTER TYPE app_role ADD VALUE 'agency_admin';
  END IF;
END $$;