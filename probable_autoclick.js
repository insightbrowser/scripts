(() => {
  const COOKIES_MODAL_MIN_HEIGHT = 100.0;

  const buildSelector = (element) => {
    let currentElement = element;
    let selectors = [];
  
    while (currentElement) {
      let id;
  
      // Selector rule should not start with number
      if (currentElement.id.trim() && !currentElement.id.trim().match('^\\d')) {
        id = `#${ currentElement.id.trim() }`;
      }
  
      let selector = id || currentElement.tagName.toLowerCase();
  
      const classes = [ ...currentElement.classList ];
      if (classes.length) {
        selector = `${ selector }.${ classes.join('.') }`;
      }
  
      selectors.unshift(selector);
  
      if (currentElement === document.body || 
          currentElement.parentElement && currentElement.parentElement === document.body) {
        break;
      }
  
      currentElement = currentElement.parentElement;
    }
  
    return selectors;
  };

  const clickElement = (el, selector, tryCount) => {
    el.click();
    // If element still exists maybe it did not work correctly, try again
    setTimeout(() => document.querySelector(selector) && tryCount < 3 && clickElement(el, selector, tryCount + 1), 250);
  };
  
  const hasFormAncestor = (element) => {
    let parent = element.parentElement;
    let hasForm = false;
  
    while(parent) {
      hasForm = parent instanceof HTMLFormElement
  
      if (hasForm) { break; }
  
      parent = parent.parentElement;
    }
  
    return hasForm
  };
  
  const isPossibleAcceptCookies = (element) => {
    // We don't want to autoclick elements inside forms
    if (hasFormAncestor(element)) {
      return null;
    }

    // If anchor element, check that is does not have an href that navigates out of the page
    if (element instanceof HTMLAnchorElement && element.href && !element.href.startsWith('#')) {
      const href = element.href.replace(document.location.href, '');

      if (!href.startsWith('#')) {
        return null;
      }
    }
  
    const mustHaveWords = [ 'ok', 'accept', 'yes', 'continue', 'agree' ];

    // Since we don't know the order of the element we are testing in the modal
    // Let's look for the ones with positive words
    const innerText = element.innerText.toLocaleLowerCase();
    
    if (!mustHaveWords.some((word) => innerText.match(`\\b${ word }\\b`))) {
      return null;
    }
  
    const highestParent = () => {
      let parent = element.parentElement;

      if (parent === document.body) {
        return null;
      }

      while (parent) {
        if (!parent.parentElement ||
            parent.parentElement === document.body ||
            parent.parentElement.clientHeight === 0) { break; }

        parent = parent.parentElement;
      }

      return parent;
    };

    const parent = highestParent();
    const parentInnerText = parent.innerText.toLocaleLowerCase();
    const foundCookies = parentInnerText.includes('cookie') || parentInnerText.includes('cookies');
    const hasEnoughSize = parent.clientHeight >= COOKIES_MODAL_MIN_HEIGHT;
    
    return foundCookies && hasEnoughSize ? element : null;
  };
  
  const run = () => {
    const checkElementsIn = (element) => {
      try {
        const elements = Array.from(element.querySelectorAll('button, a'));

        for (let element of elements) {        
          if (isPossibleAcceptCookies(element)) {
            return element;
          }
        }
      } catch {}
    };

    const buildRuleAndClick = (element) => {
      if (!element) { return; }

      const selector = buildSelector(element).join(' > ');
      clickElement(element, selector, 0);
    };

    const possibleElement = checkElementsIn(document.body);

    if (possibleElement) {
      buildRuleAndClick(possibleElement);
    } else {
      const observer = new MutationObserver((mutationsList) => {
        const findPossibleCookie = () => {
          for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
              const nodes = Array.from(mutation.addedNodes);
    
              for (const node of nodes) {
                const isTarget = node instanceof HTMLButtonElement || node instanceof HTMLAnchorElement;
                
                if (isTarget && isPossibleAcceptCookies(node)) {
                  return node;
                } else if (node.nodeType == Node.ELEMENT_NODE) {
                  const possibleElement = checkElementsIn(node);
                  
                  if (possibleElement) {
                    return possibleElement;
                  }
                }
              }
            }
          }
        }
    
        const element = findPossibleCookie();
        
        if (element) {
          buildRuleAndClick(element);
          observer.disconnect();
        }
      });
    
      observer.observe(document, { childList: true, subtree: true });
    
      setTimeout(() => observer.disconnect(), 10 * 1000);
    }
  };
  
  run();
})();
