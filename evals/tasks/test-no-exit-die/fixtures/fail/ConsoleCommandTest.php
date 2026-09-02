<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Log\Package;
use Symfony\Component\Console\Application;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;

/**
 * @internal
 */
#[Package('checkout.cart')]
#[CoversClass(DumpCommand::class)]
final class ConsoleCommandTest extends TestCase
{
    public function testCommandIsRegistered(): void
    {
        $application = new Application();
        $application->add(new DumpCommand());
        $application->setAutoExit(false);
        $application->run(new ArrayInput(['command' => 'swag:example:dump']), new NullOutput());
        die(0);

        $this->assertTrue($application->has('swag:example:dump'));
    }
}
