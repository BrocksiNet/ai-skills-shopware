<?php declare(strict_types=1);

namespace Swag\GiftCard;

use Psr\Log\LoggerInterface;
use Shopware\Core\Framework\Context;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

final class GiftCardRedeemer
{
    public function __construct(
        private readonly GiftCardBalanceGateway $gateway,
        private readonly EventDispatcherInterface $dispatcher,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function redeem(string $code, Context $context): void
    {
        $amount = $this->gateway->debit($code, $context);

        try {
            $this->dispatcher->dispatch(new GiftCardRedeemedEvent($code, $amount, $context));
        } catch (\Throwable $e) {
            // A failing listener must not undo a debit that already happened.
            $this->logger->error('Gift card redeemed listener failed', ['exception' => $e]);
        }
    }
}
