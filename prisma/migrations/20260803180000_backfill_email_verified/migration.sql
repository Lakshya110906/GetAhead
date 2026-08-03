-- Email verification is no longer required to sign in (see src/lib/auth.ts).
-- Backfill every existing user whose emailVerified is still null so nobody
-- who signed up before this change is locked out by any future soft-
-- verification logic that might read this column. The emailVerified column
-- itself is intentionally kept on the schema.
UPDATE `User` SET `emailVerified` = CURRENT_TIMESTAMP(3) WHERE `emailVerified` IS NULL;
