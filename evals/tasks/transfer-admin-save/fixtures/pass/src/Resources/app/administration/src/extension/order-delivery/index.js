Shopware.Component.override('sw-order-detail', {
    methods: {
        async onSave(...args) {
            const result = await this.$super('onSave', ...args);
            await this.refreshDeliveryBadge();
            return result;
        },
    },
});
