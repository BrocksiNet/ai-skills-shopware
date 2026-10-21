import template from './swag-loyalty-card.html.twig';

const { Component } = Shopware;

/**
 * Shows the loyalty balance of a customer. Other plugins extend this
 * component and its blocks on the customer detail page.
 */
Component.register('swag-loyalty-card', {
    template,

    inject: ['repositoryFactory'],

    props: {
        customerId: {
            type: String,
            required: true,
        },
    },

    data(): { points: number; isLoading: boolean } {
        return {
            points: 0,
            isLoading: false,
        };
    },

    computed: {
        balanceRepository() {
            return this.repositoryFactory.create('swag_loyalty_balance');
        },
    },

    created(): void {
        void this.loadBalance();
    },

    methods: {
        async loadBalance(): Promise<void> {
            this.isLoading = true;
            const balance = await this.balanceRepository.get(this.customerId);
            this.points = balance?.points ?? 0;
            this.isLoading = false;
        },
    },
});
