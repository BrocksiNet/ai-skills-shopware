import Plugin from 'src/plugin-system/plugin.class';

export default class ScrollHintPlugin extends Plugin {
    init() {
        this.el.addEventListener('scroll', this._onScroll.bind(this));
    }

    destroy() {
        super.destroy();
    }

    _onScroll() {
        if (window.scrollY > 400) {
            document.body.classList.add('is-scrolled');
        }
    }
}
