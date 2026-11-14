-- Sessions signed in before this instant are rejected (see src/lib/sessionRevocation.ts).
ALTER TABLE `User` ADD COLUMN `sessionsValidAfter` DATETIME(3) NULL;
