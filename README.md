# Jing Heng’s personal portfolio

This static portfolio brings together Jing Heng’s projects, technical skills, education, certificates and hackathon results. Visitors can browse the carousels, open certificates in Google Drive and explore linked projects on GitHub.

## Preview locally

Open [index.html](index.html) in a browser. It opens the portfolio, and the navigation links scroll to sections on the same page. Local preview requires no dependency installation or build command.

## Update the site

- Edit [pages/portfolio.html](pages/portfolio.html) to update portfolio content and links. When adding a carousel slide, add its matching navigation dot and keep the slide order and dot indices aligned.
- Edit [style.css](style.css) for themes, spacing and responsive layouts. Shared navigation, carousel controls and motion preferences are handled in [script.js](script.js).
- Keep shared navigation consistent across the HTML files in [pages](pages/). The policy index links to the individual policy pages.
- Store media, icons and fonts in [src](src/). Check the [source and license notes](src/licenses/) before replacing or publishing third-party assets.

## Before publishing

Check navigation and carousel controls on a narrow screen and with a keyboard. Test both themes, reduced motion, certificate links and project links. For static hosting, stage the public entry page, pages directory, stylesheet, script and public assets together so relative paths resolve. Keep local configuration and repository metadata outside the served directory.
