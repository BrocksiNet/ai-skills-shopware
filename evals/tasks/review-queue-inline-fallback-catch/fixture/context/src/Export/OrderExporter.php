<?php declare(strict_types=1);

namespace Swag\ErpExport\Export;

use Shopware\Core\Framework\Context;

/**
 * Loads the order with line items, deliveries and documents, renders the ERP
 * XML and uploads it to the ERP over HTTP. Takes 2 to 10 seconds per order.
 */
class OrderExporter
{
    public function export(string $orderId, Context $context): void
    {
        // ...
    }
}
