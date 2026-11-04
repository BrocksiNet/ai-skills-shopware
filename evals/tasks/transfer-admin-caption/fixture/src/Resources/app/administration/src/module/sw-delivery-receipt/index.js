import template from './sw-delivery-receipt.html.twig';
Shopware.Component.register('swag-delivery-receipt', {
    template,
    inject: ['settingsApi'],
    data() { return {form: {caption: 'Thank you', footerCode: 'C1'}}; },
    methods: {
        onCaption(value) { this.form.caption = value; },
        save() { return this.settingsApi.save({...this.form}); },
    },
});
