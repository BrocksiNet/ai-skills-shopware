<?php declare(strict_types=1);
namespace Acme\Pricing;
use Symfony\Contracts\Service\ResetInterface;
final class RateMemo implements ResetInterface
{
    private array $rates = [];
    public function get(string $channelId, callable $load): float { return $this->rates[$channelId] ??= $load($channelId); }
    public function reset(): void { $this->rates = []; }
}
