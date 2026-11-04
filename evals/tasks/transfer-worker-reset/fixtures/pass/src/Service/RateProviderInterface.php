<?php declare(strict_types=1);
namespace Swag\Rates\Service;
interface RateProviderInterface { public function load(string $channelId, string $currencyId): float; }
