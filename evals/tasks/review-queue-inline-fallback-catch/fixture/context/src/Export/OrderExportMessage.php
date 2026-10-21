<?php declare(strict_types=1);

namespace Swag\ErpExport\Export;

use Shopware\Core\Framework\MessageQueue\AsyncMessageInterface;

final class OrderExportMessage implements AsyncMessageInterface
{
    public function __construct(public readonly string $orderId)
    {
    }
}
