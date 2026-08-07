-- CreateTable
CREATE TABLE `PaperGenerationJob` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `step` VARCHAR(191) NOT NULL DEFAULT 'planner',
    `config` LONGTEXT NOT NULL,
    `plannerPlan` LONGTEXT NULL,
    `draftPaper` LONGTEXT NULL,
    `finalPaper` LONGTEXT NULL,
    `agentStates` LONGTEXT NOT NULL,
    `repairAttempts` LONGTEXT NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `validationAttempt` INTEGER NOT NULL DEFAULT 0,
    `error` TEXT NULL,
    `quotaRefunded` BOOLEAN NOT NULL DEFAULT false,
    `retryWorthwhile` BOOLEAN NOT NULL DEFAULT true,
    `lockedAt` DATETIME(3) NULL,
    `savedPaperId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PaperGenerationJob_userId_idx`(`userId`),
    INDEX `PaperGenerationJob_status_idx`(`status`),
    INDEX `PaperGenerationJob_lockedAt_idx`(`lockedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaperGenerationJob` ADD CONSTRAINT `PaperGenerationJob_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
