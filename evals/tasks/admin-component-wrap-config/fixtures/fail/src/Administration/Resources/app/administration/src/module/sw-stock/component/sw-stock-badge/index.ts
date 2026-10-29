/**
 * @sw-package inventory
 */
import type RepositoryType from 'src/core/data/repository.data';
import template from './sw-stock-badge.html.twig';

const { Mixin } = Shopware;

// TODO: switch to useNotification() from src/app/composables/use-notification
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('notification')],

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
            this.createNotificationSuccess({ message: this.$tc('sw-stock.badge.saved') });
        },
    },
});
