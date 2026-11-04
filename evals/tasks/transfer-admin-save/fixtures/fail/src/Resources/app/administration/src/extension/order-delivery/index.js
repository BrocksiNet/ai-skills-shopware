Shopware.Component.override('sw-order-detail', {
    methods: {
        async onSave(...args) {
            await this.$super('onSave', ...args);
            await this.refreshDeliveryBadge();
        },
    },
});
