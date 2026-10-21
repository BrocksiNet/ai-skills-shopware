<?php declare(strict_types=1);

namespace Swag\ErpExport\Export;

use Shopware\Core\Framework\Context;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class OrderExportHandler
{
    public function __construct(private readonly OrderExporter $exporter)
    {
    }

    public function __invoke(OrderExportMessage $message): void
    {
        $this->exporter->export($message->orderId, Context::createDefaultContext());
    }
}
