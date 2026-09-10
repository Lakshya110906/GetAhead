-- AlterTable
ALTER TABLE `Evaluation` ADD COLUMN `contentHash` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Evaluation_contentHash_idx` ON `Evaluation`(`contentHash`);
