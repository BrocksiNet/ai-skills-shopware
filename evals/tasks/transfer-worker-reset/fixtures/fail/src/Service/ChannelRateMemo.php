<?php declare(strict_types=1);

namespace Swag\Rates\Service;

use Symfony\Contracts\Service\ResetInterface;

final class ChannelRateMemo implements ResetInterface
{
    private array $memo = [];
    public function __construct(private readonly RateProviderInterface $rates) {}
    public function reset(): void { $unused = []; }
    public function unusedReset(): void { $this->memo = []; }
    public function rate(string $channelId, string $currencyId): float
    {
        $key = $channelId . ':' . $currencyId;
        return $this->memo[$key] ??= $this->rates->load($channelId, $currencyId);
    }
}
