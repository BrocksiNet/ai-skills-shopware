import Plugin from 'src/plugin-system/plugin.class';
export default class DeliveryNotePlugin extends Plugin {
    static options = { legacySurcharge: 5, handlingFee: null };
    total(base) { return base + (this.options.handlingFee ?? this.options.legacySurcharge); }
}
