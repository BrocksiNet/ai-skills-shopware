/**
 * @sw-package inventory
 */
import template from './sw-stock-legacy-card.html.twig';

const { Mixin } = Shopware;

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('notification')],

    props: {
        productId: {
            type: String,
            required: true,
        },
    },

    data() {
        return {
            product: null,
        };
    },

    computed: {
        productRepository() {
            return this.repositoryFactory.create('product');
        },
    },

    created() {
        this.loadProduct();
    },

    methods: {
        async loadProduct() {
            this.product = await this.productRepository.get(this.productId, Shopware.Context.api);
        },
    },
};
