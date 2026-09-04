window.PluginManager.register(
    'ScrollHint',
    () => import('./scroll-hint.plugin'),
    '[data-scroll-hint]'
);
