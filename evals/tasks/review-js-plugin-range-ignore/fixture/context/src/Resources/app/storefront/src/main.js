import HoverIntentCartPlugin from './plugin/hover-intent-cart.plugin';

const PluginManager = window.PluginManager;

PluginManager.register('HoverIntentCart', HoverIntentCartPlugin, '[data-off-canvas-cart]');
