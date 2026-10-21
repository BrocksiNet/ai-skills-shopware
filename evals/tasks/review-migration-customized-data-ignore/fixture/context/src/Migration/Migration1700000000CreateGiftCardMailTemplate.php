<?php declare(strict_types=1);

namespace Swag\GiftCard\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Defaults;
use Shopware\Core\Framework\Migration\MigrationStep;
use Shopware\Core\Framework\Uuid\Uuid;

class Migration1700000000CreateGiftCardMailTemplate extends MigrationStep
{
    public const MAIL_TEMPLATE_ID = '0190a1b2c3d4e5f6a7b8c9d0e1f2a3b4';

    public function getCreationTimestamp(): int
    {
        return 1700000000;
    }

    public function update(Connection $connection): void
    {
        $connection->insert('mail_template', [
            'id' => Uuid::fromHexToBytes(self::MAIL_TEMPLATE_ID),
            'mail_template_type_id' => $this->giftCardMailTypeId($connection),
            'system_default' => 1,
            'created_at' => (new \DateTime())->format(Defaults::STORAGE_DATE_TIME_FORMAT),
        ]);

        $connection->insert('mail_template_translation', [
            'mail_template_id' => Uuid::fromHexToBytes(self::MAIL_TEMPLATE_ID),
            'language_id' => Uuid::fromHexToBytes(Defaults::LANGUAGE_SYSTEM),
            'subject' => 'Your gift card',
            'content_html' => '<p>Your gift card code: {{ giftCard.code }}</p>',
            'content_plain' => 'Your gift card code: {{ giftCard.code }}',
            'created_at' => (new \DateTime())->format(Defaults::STORAGE_DATE_TIME_FORMAT),
        ]);
    }

    private function giftCardMailTypeId(Connection $connection): string
    {
        return (string) $connection->fetchOne(
            'SELECT id FROM mail_template_type WHERE technical_name = :name',
            ['name' => 'swag_gift_card.issued'],
        );
    }
}
