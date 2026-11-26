<?php declare(strict_types=1);

namespace Shopware\Core\Checkout\Cart;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Shopware\Core\Defaults;
use Shopware\Core\Framework\Uuid\Uuid;

/**
 * Turns a cart into the array the storefront and the Store API return.
 */
final class CartNormalizer
{
    public function __construct(private readonly Connection $connection)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function normalize(Cart $cart): array
    {
        $data = $cart->jsonSerialize();
        $data['productNumbers'] = $this->connection->fetchAllKeyValue(
            'SELECT LOWER(HEX(`id`)), `product_number` FROM `product` WHERE `id` IN (:ids) AND `version_id` = :liveVersionId',
            [
                'ids' => Uuid::fromHexToBytesList($cart->getLineItems()->getReferenceIds()),
                'liveVersionId' => Uuid::fromHexToBytes(Defaults::LIVE_VERSION),
            ],
            ['ids' => ArrayParameterType::BINARY],
        );

        return $data;
    }
}
