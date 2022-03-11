// ==UserScript==
// @name         Open top 5
// @version      0.0.1
// @description  Open new tabs for the first 5 results in a search result page.
// @author       Felipe
// @match        *
// @grant        GM.openInTab
// ==/UserScript==

(async () => {
  const COUNTER_SELECTOR = '.hyperweb-notification-center-counter span';
  const SHORTCUTS_SELECTOR = '.hyperweb-notification-center-shortcuts';
  const FULL_MESSAGE_SELECTOR = '.hyperweb-message-notification';
  const QUERIES_URL = 'https://raw.githubusercontent.com/insightbrowser/augmentations/main/serp_query_selectors.json';
  const LINKS_LIMIT = 5;

  const isMobile = window.navigator.userAgent.toLocaleLowerCase().includes('iphone');
  const request = await fetch(QUERIES_URL);
  const queries = await request.json();
  const se = Object
    .values(queries)
    .find((query) => {
      const se = query.search_engine_json;

      if (!se || !se.is_web_search) { return false; }

      return se.match_prefix && document.location.href.match(se.match_prefix);
    });

  if (!se) { return; }

  const linkQuery = se.querySelector[isMobile ? 'phone' : 'desktop'];

  if (!linkQuery) { return; }

  const buildAnchor = (text) => {
    const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><!--! Font Awesome Pro 6.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M320 344.6c0 74.66-60.73 135.4-135.4 135.4H104.7c-46.81 0-88.22-29.83-103-74.23c-5.594-16.77 3.469-34.89 20.23-40.48c16.83-5.625 34.91 3.469 40.48 20.23c6.078 18.23 23.08 30.48 42.3 30.48h79.95c39.36 0 71.39-32.03 71.39-71.39s-32.03-71.38-71.39-71.38H32c-9.484 0-18.47-4.203-24.56-11.48C1.359 254.5-1.172 244.9 .5156 235.6l32-177.2C35.27 43.09 48.52 32.01 64 32.01l192 .0049c17.67 0 32 14.33 32 32s-14.33 32-32 32H90.73L70.3 209.2h114.3C259.3 209.2 320 269.1 320 344.6z"/></svg>';
    const anchor = document.createElement('a');
    anchor.classList.add('hw-link');
    anchor.innerHTML = [ icon, text ].filter((el) => !!el).join(' ');
    anchor.addEventListener('click', () => {
      Array.from(document.querySelectorAll(linkQuery))
        .map((l) => l.href)
        .filter((l) => !!l)
        .slice(0, LINKS_LIMIT).forEach(GM.openInTab);
    });

    return anchor;
  };

  const waitForFullMessage = () => {
    const fullMessage = document.querySelector(FULL_MESSAGE_SELECTOR);
    
    if (fullMessage) {
      const children = Array.from(fullMessage.childNodes)
      const unwantedChildren = children
        .filter((c) => c.textContent.trim() === 'or' || c.textContent.trim() === ',')
        .filter((c) => !(c instanceof HTMLAnchorElement));
      const requiredDhildren = children
        .filter((c) => c.textContent.trim() !== 'or' && c.textContent.trim() !== ',')
      const anchors = requiredDhildren.filter((el) => el instanceof HTMLAnchorElement);

      unwantedChildren.forEach((a) => a.remove());
      anchors.forEach((a) => a.remove());
      anchors.push(buildAnchor('Open top 5 results'));

      anchors.forEach((a, index) => {
        if (index === 0) {
          fullMessage.insertBefore(a, requiredDhildren[1].nextSibling);
        } else {
          const separator = document.createTextNode(index === anchors.length - 1 ? ' or ' : ', ');
          fullMessage.insertBefore(separator, anchors[index - 1].nextSibling);
          fullMessage.insertBefore(a, separator.nextSibling);
        }
      });
    } else {
      setTimeout(waitForFullMessage, 50);
    }
  };

  const waitForShortcuts = () => {
    const shortcuts = document.querySelector(SHORTCUTS_SELECTOR);

    if (shortcuts) {
      shortcuts.appendChild(buildAnchor());

      const counter = document.querySelector(COUNTER_SELECTOR);

      if (counter && counter.textContent) {
        counter.textContent = parseInt(counter.textContent) + 1;
      }
    } else {
      setTimeout(waitForShortcuts, 50);
    }
  };

  waitForFullMessage();
  waitForShortcuts();
})();
