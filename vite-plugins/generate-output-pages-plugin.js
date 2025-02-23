import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser();
const basePath = "/web-gpu-experiments/samples";

/**
 * @param {string} samplesDir
 * @param {string} outputFile
 * @param {string} pageTitle
 */
function generateOutputPage(samplesDir, outputFile, pageTitle) {
  const pages = fs
    .readdirSync(samplesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => `/${samplesDir}/${dirent.name}/index.html`);

  fs.writeFileSync(
    outputFile,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=2.0" />
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="../public/styles/index.css" />
  </head>
  <body>
    <section class="sample-layout">
      ${pages
        .map((page) => {
          const pageContents = fs.readFileSync(path.resolve(__dirname, "..", page)).toString();

          const xml = xmlParser.parse(pageContents);
          const pageSampleTitle = xml["!doctype"]["html"]["head"]["title"];
          const pageUrl = `${basePath}${page.split(basePath)[1]}`;

          return `<div class="sample">
        <iframe src="${pageUrl}"></iframe>
        <a href="${pageUrl}" target="_blank" class="explanation">${pageSampleTitle}</a>
      </div>`;
        })
        .join("\n      ")}
    </section>
  </body>
</html>  
  `,
  );
  console.log(`Updated file "${outputFile}"`);
}

/**
 * @param {string} samplesDir
 * @param {string} outputFile
 */
function generateOutputSearchPage(samplesDir, outputFile) {
  const pages = fs
    .readdirSync(samplesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => `/${samplesDir}/${dirent.name}/index.html`);

  fs.writeFileSync(
    outputFile,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=2.0" />
    <title>High performance chart</title>
    <link rel="stylesheet" href="../public/styles/search/props.easing.css" />
    <link rel="stylesheet" href="../public/styles/search/theme-toggle.css" />
    <link rel="stylesheet" href="../public/styles/search/search.css" />
  </head>
  <body>
    <div class="theme-toggle" id="theme-toggle" title="Toggles light & dark" aria-label="auto" aria-live="polite">
      <svg class="sun-and-moon" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
        <mask class="moon" id="moon-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle cx="24" cy="10" r="6" fill="black" />
        </mask>
        <circle class="sun" cx="12" cy="12" r="6" mask="url(#moon-mask)" fill="currentColor" />
        <g class="sun-beams" stroke="currentColor">
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
    </div>

    <div class="search-button">
      <span class="button outline-like" tabindex="1" id="searchButton" onclick="searchBar.showModal()">
        <img src="/icons/search.svg" alt="search" />
      </span>
    </div>

    <dialog id="searchBar" class="dialog">
      <div class="dialog-column">
        <div class="dialog-row">
          <span class="button">
            <img src="/icons/leading.svg" alt="leading" />
          </span>
          <form class="search-form" method="dialog" id="searchForm">
            <input type="search" placeholder="Search..." tabindex="0" id="searchInput" />
            <button type="submit">
              <span class="button">
                <img src="/icons/search.svg" alt="search" />
              </span>
            </button>
          </form>
        </div>
        <div class="sample-layout">
          ${pages
            .map((page) => {
              const pageContents = fs.readFileSync(path.resolve(__dirname, "..", page)).toString();

              const xml = xmlParser.parse(pageContents);
              const pageSampleTitle = xml["!doctype"]["html"]["head"]["title"];
              const pageUrl = `${basePath}${page.split(basePath)[1]}`;

              return `<div class="sample" data-search="${pageSampleTitle}" style="display: flex">
            <iframe src="${pageUrl}"></iframe>
            <div class="explanation">
              <a href="${pageUrl}" target="_blank">${pageSampleTitle}</a>
            </div>
          </div>`;
            })
            .join("\n          ")}
        </div>
      </div>
    </dialog>

    <script type="module" src="./search/toggle-search.ts"></script>
    <script type="module" src="./search/theme-toggle.ts"></script>
    <script type="module" src="./search/find-elements.ts"></script>
  </body>
</html>
  `,
  );
  console.log(`Updated file "${outputFile}"`);
}

export default function generateOutputPagesPlugin() {
  const samplesDir = path.resolve(__dirname, "..", "samples");
  const outputFile = path.resolve(__dirname, "..", "output/index.html");
  const outputSearchFile = path.resolve(__dirname, "..", "output/search.html");

  return {
    name: "generate-output-pages",
    buildStart() {
      generateOutputPage(samplesDir, outputFile, "Samples");
      generateOutputSearchPage(samplesDir, outputSearchFile, "Samples: search");
    },
    watchChange(id) {
      if (id.startsWith(samplesDir)) {
        generateOutputPage(samplesDir, outputFile, "Samples");
        generateOutputSearchPage(samplesDir, outputSearchFile, "Samples: search");
      }
    },
  };
}
