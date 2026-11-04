<?php declare(strict_types=1);
namespace Acme\Export\Export;
use Acme\Export\Message\ExportBatchMessage;
use Symfony\Component\Messenger\MessageBusInterface;
final class BatchProducer
{
    public function dispatch(MessageBusInterface $bus): void
    {
        $bus->dispatch(new ExportBatchMessage());
    }
}
