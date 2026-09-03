-- AlterTable
ALTER TABLE `Evaluation` ADD COLUMN `gradedFromCache` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `bypassGradingCache` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `GradingCache` (
    `id` VARCHAR(191) NOT NULL,
    `contentHash` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `promptVersion` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(191) NOT NULL,
    `examType` VARCHAR(191) NOT NULL,
    `extraction` LONGTEXT NOT NULL,
    `result` LONGTEXT NOT NULL,
    `hitCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GradingCache_contentHash_key`(`contentHash`),
    INDEX `GradingCache_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
