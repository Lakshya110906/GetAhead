-- AlterTable
ALTER TABLE `User` ADD COLUMN `consentAcceptedAt` DATETIME(3) NULL,
    ADD COLUMN `consentVersion` VARCHAR(191) NULL,
    ADD COLUMN `ageConsentConfirmed` BOOLEAN NOT NULL DEFAULT false;
