<?php declare(strict_types=1);

namespace Swag\Stock\Import;

use Shopware\Core\Framework\Log\Package;

#[Package('inventory')]
class SupplierStockImporter
{
    public function __construct(
        private readonly SupplierFeedClient $client,
        private readonly StockUpdater $updater,
    ) {
    }

    /**
     * @return int number of updated products
     */
    public function import(): int
    {
        $feed = json_decode($this->client->fetch(), true, 512, \JSON_THROW_ON_ERROR);

        $stock = [];
        foreach ($feed['items'] as $item) {
            $stock[(string) $item['sku']] = (int) $item['quantity'];
        }

        return $this->updater->update($stock);
    }
}
