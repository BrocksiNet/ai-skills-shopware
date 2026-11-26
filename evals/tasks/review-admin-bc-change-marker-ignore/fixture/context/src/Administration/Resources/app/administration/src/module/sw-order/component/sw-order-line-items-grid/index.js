import template from './sw-order-line-items-grid.html.twig';

export default {
    template,

    emits: ['item-delete'],

    props: {
        order: {
            type: Object,
            required: true,
        },
    },

    data() {
        return {
            lastDeletedIndex: null,
        };
    },

    methods: {
        onDeleteItem(item, itemIndex) {
            this.order.lineItems.remove(item.id);
            this.lastDeletedIndex = itemIndex;
            this.$emit('item-delete', item.id);
        },
    },
};
