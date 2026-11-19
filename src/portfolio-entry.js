// Preserve deep links at the public site root and under static hosting subpaths.
const portfolioPage = new URL('pages/portfolio.html', document.baseURI);
portfolioPage.search = window.location.search;
portfolioPage.hash = window.location.hash;
window.location.replace(portfolioPage.href);
