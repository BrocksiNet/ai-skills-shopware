export default class HoverIntentCartPlugin extends window.PluginBaseClass {
    static options = {
        openDelay: 150,
    };

    init() {
        this._timer = null;
        this.el.addEventListener('mouseenter', this._onEnter.bind(this));
        this.el.addEventListener('mouseleave', this._onLeave.bind(this));
    }

    _onEnter() {
        this._timer = window.setTimeout(() => this.el.click(), this.options.openDelay);
    }

    _onLeave() {
        window.clearTimeout(this._timer);
    }
}
