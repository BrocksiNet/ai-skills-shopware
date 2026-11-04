<?php declare(strict_types=1);

namespace Swag\Rates\Service;

final class ChannelRateMemo
{
    private array $memo = [];
    public function __construct(private readonly RateProviderInterface $rates) {}
    public function rate(string $channelId, string $currencyId): float
    {
        $key = $channelId . ':' . $currencyId;
        return $this->memo[$key] ??= $this->rates->load($channelId, $currencyId);
    }
}
