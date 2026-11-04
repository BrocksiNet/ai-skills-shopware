Shopware.Component.override('sw-order-detail', {
    methods: {
        async onSave() {
            await this.orderRepository.save(this.order);
            return this.refreshDeliveryBadge();
        },
    },
});
