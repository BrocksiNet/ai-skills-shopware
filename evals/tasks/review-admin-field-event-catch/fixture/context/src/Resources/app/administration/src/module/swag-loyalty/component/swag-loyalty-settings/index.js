import template from './swag-loyalty-settings.html.twig';

const { Component, Mixin } = Shopware;

Component.register('swag-loyalty-settings', {
    template,

    inject: ['systemConfigApiService'],

    mixins: [
        Mixin.getByName('notification'),
    ],

    data() {
        return {
            isLoading: false,
            settings: {
                enabled: true,
                pointsPerEuro: 1,
                expiryMode: 'never',
            },
        };
    },

    computed: {
        expiryModeOptions() {
            return [
                { value: 'never', label: this.$tc('swag-loyalty.settings.expiryNever') },
                { value: 'yearly', label: this.$tc('swag-loyalty.settings.expiryYearly') },
            ];
        },
    },

    created() {
        this.loadSettings();
    },

    methods: {
        async loadSettings() {
            this.isLoading = true;
            const values = await this.systemConfigApiService.getValues('SwagLoyalty.config');
            this.settings = {
                ...this.settings,
                enabled: values['SwagLoyalty.config.enabled'] ?? this.settings.enabled,
                pointsPerEuro: values['SwagLoyalty.config.pointsPerEuro'] ?? this.settings.pointsPerEuro,
                expiryMode: values['SwagLoyalty.config.expiryMode'] ?? this.settings.expiryMode,
            };
            this.isLoading = false;
        },

        async onSave() {
            this.isLoading = true;
            await this.systemConfigApiService.saveValues({
                'SwagLoyalty.config.enabled': this.settings.enabled,
                'SwagLoyalty.config.pointsPerEuro': this.settings.pointsPerEuro,
                'SwagLoyalty.config.expiryMode': this.settings.expiryMode,
            });
            this.isLoading = false;
            this.createNotificationSuccess({
                message: this.$tc('swag-loyalty.settings.saved'),
            });
        },
    },
});
