import Plugin from 'src/plugin-system/plugin.class';

export default class ListingPricePlugin extends Plugin {
    init() {
        fetch('/store-api/account/customer', { cache: 'no-store' }).then((response) => {
            this.el.textContent = String(response.status);
        });
    }
}
