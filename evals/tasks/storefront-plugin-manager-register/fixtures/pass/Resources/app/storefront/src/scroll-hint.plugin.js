import Plugin from 'src/plugin-system/plugin.class';

export default class ScrollHintPlugin extends Plugin {
    init() {
        this._onScroll = this._onScroll.bind(this);
        window.addEventListener('scroll', this._onScroll);
    }

    destroy() {
        window.removeEventListener('scroll', this._onScroll);
        super.destroy();
    }

    _onScroll() {
        if (window.scrollY > 400) {
            document.body.classList.add('is-scrolled');
        }
    }
}
