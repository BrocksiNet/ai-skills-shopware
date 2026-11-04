import Plugin from 'src/plugin-system/plugin.class';

export default class DeliveryNotePlugin extends Plugin {
    static options = { legacySurcharge: 5 };
    total(base) { return base + this.options.legacySurcharge; }
}
