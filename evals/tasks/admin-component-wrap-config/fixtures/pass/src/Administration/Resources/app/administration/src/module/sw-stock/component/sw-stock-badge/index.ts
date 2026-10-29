/**
 * @sw-package inventory
 */
import type RepositoryType from 'src/core/data/repository.data';
import useNotification from 'src/app/composables/use-notification';
import template from './sw-stock-badge.html.twig';

export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['repositoryFactory'],

    props: {
        productId: {
            type: String,
            required: true,
        },
    },

    data(): { product: Entity<'product'> | null } {
        return {
            product: null,
        };
    },

    computed: {
        productRepository(): RepositoryType<'product'> {
            return this.repositoryFactory.create('product');
        },
    },

    created(): void {
        void this.loadProduct();
    },

    methods: {
        async loadProduct(): Promise<void> {
            this.product = await this.productRepository.get(this.productId, Shopware.Context.api);
        },

        async save(): Promise<void> {
            if (!this.product) {
                return;
            }

            await this.productRepository.save(this.product, Shopware.Context.api);
            await this.loadProduct();
            useNotification().createNotificationSuccess({ message: this.$tc('sw-stock.badge.saved') });
        },
    },
});
