<?php declare(strict_types=1);

namespace Shopware\Tests\Integration\Core\Checkout\Cart;

use PHPUnit\Framework\TestCase;
use Shopware\Core\Checkout\Cart\Cart;
use Shopware\Core\Checkout\Cart\CartNormalizer;
use Shopware\Core\Checkout\Cart\LineItem\LineItem;
use Shopware\Core\Content\Test\Product\ProductBuilder;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Test\TestCaseBase\IntegrationTestBehaviour;
use Shopware\Core\Test\Stub\Framework\IdsCollection;

/**
 * @internal
 */
#[Package('checkout')]
class CartNormalizerIntegrationTest extends TestCase
{
    use IntegrationTestBehaviour;

    public function testNormalizeAddsTheProductNumbersFromTheDatabase(): void
    {
        $ids = new IdsCollection();
        $product = (new ProductBuilder($ids, 'SW-10001'))->price(10)->build();
        $this->getContainer()->get('product.repository')->create([$product], Context::createDefaultContext());

        $cart = new Cart('test-token');
        $cart->add(new LineItem($ids->get('SW-10001'), LineItem::PRODUCT_LINE_ITEM_TYPE, $ids->get('SW-10001')));

        $data = $this->getContainer()->get(CartNormalizer::class)->normalize($cart);

        static::assertSame([$ids->get('SW-10001') => 'SW-10001'], $data['productNumbers']);
    }

    public function testNormalizeReturnsNoProductNumbersForAnEmptyCart(): void
    {
        $data = $this->getContainer()->get(CartNormalizer::class)->normalize(new Cart('test-token'));

        static::assertSame([], $data['productNumbers']);
    }
}
