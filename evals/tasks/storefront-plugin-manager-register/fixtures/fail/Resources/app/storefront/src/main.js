window.PluginManager.register(
    'ScrollHint',
    () => import('./scroll-hint.plugin'),
    '[data-scroll-hint]'
);

window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
        document.body.classList.add('is-scrolled');
    }
});

window.removeEventListener('scroll', () => {});
