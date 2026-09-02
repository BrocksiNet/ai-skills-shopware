import ProductCard from './product-card';

describe('swag-example-product-card', () => {
    it('requires a productId', () => {
        expect(ProductCard.props.productId.required).toBe(true);
    });
});
