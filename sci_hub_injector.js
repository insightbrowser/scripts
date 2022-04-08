// ==UserScript==
// @name Sci Hub Injector
// @version 0.1
// @description Adds SciHub links to popular publishing websites to make free access to science even easier.
// @include https://pubmed.ncbi.nlm.nih.gov/*
// @include https://www.nature.com/*
// @include https://www.tandfonline.com/*
// @include https://www.sciencedirect.com/*
// @include http://www.eurekaselect.com/*
// @include https://www.science.org/*
// @include https://dom-pubs.onlinelibrary.wiley.com/doi/*
// @include https://link.springer.com/*
// @include https://www.jstor.org/*
// @include https://www.researchgate.net/*
// @include https://ieeexplore.ieee.org/*
// @include https://journals.sagepub.com/*
// @include https://www.degruyter.com/*
// @grant GM.registerButton
// @grant GM.openInTab
// ==/UserScript==

function sciHubLink(doi) {
  return 'https://sci-hub.se/' + doi;
}

function pubMed() {
  return document.querySelector(".identifier.doi > a")?.innerText;
}

function nature() {
  return document
    .querySelector(
      ".c-bibliographic-information__list-item--doi > p > span.c-bibliographic-information__value"
    )
    ?.textContent.split(".org/")[1];
}

function taylorFrancis() {
  return document
    .querySelector(".dx-doi > a")
    ?.textContent.split(".org/")[1];
}

function sciencedirect() {
  return document.querySelector(".doi")?.textContent.split(".org/")[1];
}

function eurekaSelect() {
  const doiLinks = Array.from(document.querySelectorAll("a"))
    .filter((a) => a.href.includes("doi.org"))
    .map((a) => a.href);
  return doiLinks[0]?.split(".org/")[1];
}

function researchGate() {
  const doiLinks = Array.from(document.querySelectorAll("a"))
    .filter((a) => a.href.includes("doi.org"))
    .map((a) => a.href);
  return doiLinks[0]?.split(".org/")[1];
}

function science() {
  const doiLinks = Array.from(document.querySelectorAll("a"))
    .filter((a) => a.href.includes("doi.org"))
    .map((a) => a.href);
  return doiLinks[0]?.split(".org/")[1];
}

/* In honor of Aaron Swartz */
function jstor() {
  return document.querySelector("[data-doi]").attributes.getNamedItem("data-doi").value;
}

function wiley() {
  const doiLinks = Array.from(document.querySelectorAll("a"))
    .filter((a) => a.href.includes("doi.org"))
    .map((a) => a.href);
  return doiLinks[0].split(".org/")[1];
}

function springerLink() {
  if (url.includes("journal")) {
    return springerLinkJournal();
  }

  return getSpringerDoi(document.location.href);
}

function getSpringerDoi(url) {
  return decodeURIComponent(url).match(/10.+?[^#]+/)?.[0];
}

function springerLinkJournal() {
  const articleListElements = Array.from(document.querySelectorAll(".app-volumes-and-issues__article-list > li"));
  for (const articleElement of articleListElements) {
    const articleUrl = articleElement.querySelector("h3 a").getAttribute("href");
    const doi = getSpringerDoi(articleUrl);
    articleElement.querySelector(".c-meta").innerHTML += `
      <li class="c-meta__item c-meta__item--block-sm-max">
        <a href="${sciHubLink(doi)}" title="SciHub">View on SciHub</a>
      </li>
    `;
  }
}

function springerLinkArticle(doi) {
  const details = document.querySelector(".c-article-info-details");
  details.innerHTML += `
    <a class="c-article-info-details__cite-as" href="${sciHubLink(doi)}" title="SciHub">
      <img width=24 height=24 src="https://sci-hub.se/misc/img/ravenround.gif" style="vertical-align:bottom"/>
      View On SciHub
    </a>
  `;
}

function springerLinkGeneral(doi) {
  const contextContainer = document.querySelector(".main-context__container") || document.getElementById("book-metrics");
  contextContainer.innerHTML += `
    <div style="align-self:center">
      <a href="${sciHubLink(doi)}" title="SciHub">
        <img width=24 height=24 src="https://sci-hub.se/misc/img/ravenround.gif" style="width:24px; vertical-align:bottom"/>
        View On SciHub
      </a>
    </div>
  `;
}

function ieeexploreLink() {
    let foundLinks = [];
    document.querySelectorAll("a").forEach(l => {
        if (l.href.includes("doi.org")) {
            foundLinks.push(l.href);
        }
    });
    return foundLinks[0]?.split(".org/")[1];
  }

  
function sagePub() {
  return document.querySelector("meta[scheme='doi']").getAttribute("content");
}

function deGruyter() {
  const url = document.location.href;

  if (url.includes("/document/")) {
    return document.querySelector("meta[name='citation_doi']").getAttribute("content");
  } else if (url.includes("/journal/")) {
    const citeButtons = document.querySelectorAll('.searchResultActions');
    for (const citeButton of citeButtons) {
      citeButton.innerHTML += `
      <button id="citationsModalButton" type="button" class="btn btn-main-content ga_cite_this mr-2" aria-controls="citationsModal"><a href="${sciHubLink(citeButton.getAttribute('data-doi'))}">Access on SciHub</a>
      </button>
      `
    }
  }
}

function addSciHubLink() {
  const url = document.location.href;
  let doi;
  if (url.includes("pubmed.ncbi.nlm.nih.gov")) {
    doi = pubMed();
  } else if (url.includes("nature.com")) {
    doi = nature();
  } else if (url.includes("tandfonline.com")) {
    doi = taylorFrancis();
  } else if (url.includes("www.sciencedirect.com")) {
    doi = sciencedirect();
  } else if (url.includes("eurekaselect.com")) {
    doi = eurekaSelect();
  } else if (url.includes("science.org")) {
    doi = science();
  } else if (url.includes("wiley.com")) {
    doi = wiley();
  } else if (url.includes("link.springer.com")) {
    doi = springerLink();
  } else if (url.includes("jstor.org")) {
    doi = jstor();
  } else if (url.includes("researchgate.net")) {
    doi = researchGate();
  } else if (url.includes("ieeexplore.ieee.org/")) {
    doi = ieeexploreLink();
  } else if (url.includes("journals.sagepub.com")) {
    doi = sagePub();
  } else if (url.includes("degruyter.com")) {
    doi = deGruyter();
  }

  if (doi) {
    const cb = () => GM.openInTab(`https://sci-hub.se/${doi.trim()}`);
    GM.registerButton('sci-hub', 'Open this page on Sci-Hub', null, cb);
  }
}

addSciHubLink();
