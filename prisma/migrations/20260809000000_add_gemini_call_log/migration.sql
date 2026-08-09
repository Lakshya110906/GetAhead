-- CreateTable
CREATE TABLE `GeminiCallLog` (
    `id` VARCHAR(191) NOT NULL,
    `operation` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `agent` VARCHAR(191) NULL,
    `promptTokens` INTEGER NULL,
    `completionTokens` INTEGER NULL,
    `totalTokens` INTEGER NULL,
    `isRetry` BOOLEAN NOT NULL DEFAULT false,
    `attemptNumber` INTEGER NOT NULL DEFAULT 1,
    `success` BOOLEAN NOT NULL,
    `errorType` VARCHAR(191) NULL,
    `durationMs` INTEGER NULL,
    `replayed` BOOLEAN NOT NULL DEFAULT false,
    `correlationId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GeminiCallLog_operation_idx`(`operation`),
    INDEX `GeminiCallLog_correlationId_idx`(`correlationId`),
    INDEX `GeminiCallLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
