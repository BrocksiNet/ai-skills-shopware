export default function formatPoints(points, locale) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(points);
}
