import Plugin from 'src/plugin-system/plugin.class';

/**
 * Shows the loyalty points badge on the product detail page.
 * Themes configure it through data-swag-loyalty-badge-options.
 */
export default class SwagLoyaltyBadgePlugin extends Plugin {
    static options = {
        showTooltip: true,
        tooltipSelector: '.swag-loyalty-badge__tooltip',
    };

    init() {
        this._render();
    }

    _render() {
        if (this.options.showTooltip) {
            this.el.querySelector(this.options.tooltipSelector)?.classList.add('is--visible');
        }

        this.$emitter.publish('onBadgeRendered', { el: this.el });
    }
}
