<?php declare(strict_types=1);

namespace Shopware\Tests\Unit\Core\Checkout;

use PHPUnit\Framework\TestCase;

final class FlagThrowTest extends TestCase
{
    /**
     * @deprecated tag:v6.9.0
     * Removed with the feature flag.
     */
    public function testThrowsWhenMajorActive(): void
    {
        // Asserts the throw while v6.9.0.0 is active.
    }
}
