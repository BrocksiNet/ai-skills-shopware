import ProductCard from '../../Resources/app/administration/src/module/swag-example/product-card/product-card';

describe('swag-example-product-card', () => {
    it('requires a productId', () => {
        expect(ProductCard.props.productId.required).toBe(true);
    });
});
