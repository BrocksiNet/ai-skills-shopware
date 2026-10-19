<?php declare(strict_types=1);

namespace Swag\Restock;

use Psr\Log\LoggerInterface;
use Shopware\Core\Framework\Context;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

/**
 * Registered as a public service in the plugin container.
 */
final class ProductRestockNotifier
{
    public function __construct(
        private readonly EventDispatcherInterface $dispatcher,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function notify(string $productId, int $stock, Context $context): void
    {
        if ($stock <= 0) {
            return;
        }

        try {
            $this->dispatcher->dispatch(new ProductRestockedEvent($productId, $stock, $context));
        } catch (\Throwable $e) {
            // A failing subscriber must not break the stock update.
            $this->logger->error('Restock notification failed', ['exception' => $e]);
        }
    }
}
