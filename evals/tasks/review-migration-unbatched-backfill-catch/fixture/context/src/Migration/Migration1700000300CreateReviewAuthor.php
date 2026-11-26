<?php declare(strict_types=1);

namespace Swag\Review\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration1700000300CreateReviewAuthor extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 1700000300;
    }

    public function update(Connection $connection): void
    {
        $connection->executeStatement('
            CREATE TABLE IF NOT EXISTS `swag_review_author` (
                `review_id` BINARY(16) NOT NULL,
                `name` VARCHAR(255) NOT NULL,
                PRIMARY KEY (`review_id`),
                CONSTRAINT `fk.swag_review_author.review_id` FOREIGN KEY (`review_id`)
                    REFERENCES `swag_review` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ');
    }
}
