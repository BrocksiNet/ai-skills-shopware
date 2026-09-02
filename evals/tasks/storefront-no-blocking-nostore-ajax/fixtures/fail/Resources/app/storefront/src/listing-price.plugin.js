import Plugin from 'src/plugin-system/plugin.class';

export default class ListingPricePlugin extends Plugin {
    init() {
        window.requestAnimationFrame(() => {
            fetch('/store-api/account/customer', { cache: 'no-store' });
        });
    }
}
