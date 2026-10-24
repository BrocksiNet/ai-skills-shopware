import template from './swag-loyalty-points-preview.html.twig';

const { Component } = Shopware;

Component.register('swag-loyalty-points-preview', {
    template,

    props: {
        order: {
            type: Object,
            required: true,
        },
    },

    data() {
        return {
            settings: {
                pointsPerEuro: 1,
            },
        };
    },

    computed: {
        earnedPoints() {
            return this.pointsFor(this.order.amountTotal);
        },
    },

    methods: {
        pointsFor(amount) {
            return Math.floor(amount * this.settings.pointsPerEuro);
        },
    },
});
