<?php declare(strict_types=1);

namespace Shopware\Tests\Integration\Core\Checkout\Promotion\Validator;

use PHPUnit\Framework\TestCase;
use Shopware\Core\Checkout\Promotion\Validator\PromotionDateValidator;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Test\TestCaseBase\DatabaseTransactionBehaviour;
use Shopware\Core\Framework\Test\TestCaseBase\KernelTestBehaviour;
use Shopware\Core\Test\Assert\WriteViolations;
use Shopware\Core\Test\Stub\Framework\IdsCollection;

/**
 * @internal
 */
#[Package('checkout')]
class PromotionDateValidatorTest extends TestCase
{
    use DatabaseTransactionBehaviour;
    use KernelTestBehaviour;

    private IdsCollection $ids;

    protected function setUp(): void
    {
        $this->ids = new IdsCollection();
    }

    public function testAPromotionCannotEndBeforeItStarts(): void
    {
        WriteViolations::assertRejected([PromotionDateValidator::VIOLATION_VALID_UNTIL], fn () => $this->createPromotion([
            'validFrom' => '2030-06-01 00:00:00',
            'validUntil' => '2030-01-01 00:00:00',
        ]));
    }

    /**
     * @param array<string, mixed> $data
     */
    private function createPromotion(array $data): void
    {
        static::getContainer()->get('promotion.repository')->create([[
            'id' => $this->ids->get('promotion'),
            'name' => 'Summer sale',
            'active' => true,
            ...$data,
        ]], Context::createDefaultContext());
    }
}
