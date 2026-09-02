import Plugin from 'src/plugin-system/plugin.class';

export default class ListingPricePlugin extends Plugin {
    init() {
        this.el.classList.add('is-ready');
    }
}
