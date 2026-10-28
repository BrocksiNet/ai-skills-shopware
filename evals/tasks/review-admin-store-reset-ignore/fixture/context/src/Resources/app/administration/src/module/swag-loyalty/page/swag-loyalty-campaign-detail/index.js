import template from './swag-loyalty-campaign-detail.html.twig';

const { Component } = Shopware;

Component.register('swag-loyalty-campaign-detail', {
    template,

    computed: {
        campaign() {
            return Shopware.Store.get('swagLoyaltyCampaign').campaign;
        },
    },

    methods: {
        onSave() {
            Shopware.Store.get('swagLoyaltyCampaign').save();
        },
    },
});
