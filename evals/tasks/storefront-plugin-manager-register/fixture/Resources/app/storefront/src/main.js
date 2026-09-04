document.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
        document.body.classList.add('is-scrolled');
    }
});
