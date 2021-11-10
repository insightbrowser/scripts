(() => {
  const COOKIES_MODAL_MAX_HEIGHT = 500.0

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
    el.click()
  
    // If element still exists maybe it did not work correctly, try again
    if (document.querySelector(selector) && tryCount < 3) {
      setTimeout(() => clickElement(el, selector, tryCount + 1), 250);
    }
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
  
  const isPossibleAcceptCookies = (button) => {
    // We don't want to autoclick buttons inside forms
    if (hasFormAncestor(button)) {
      return null;
    }
  
    const mustHaveWords = [ 'ok', 'accept', 'yes', 'continue', 'agree' ];
  
    // Since we don't know the order of the button we are testing in the modal
    // Let's look for the ones with positive words
    const innerText = button.innerText.toLocaleLowerCase();
    if (!mustHaveWords.some((word) => innerText.includes(word))) {
      return null;
    }
  
    let foundCookies = false;
    let isModal = false;
    let parent = button.parentElement;
  
    while (parent) {
      const innerText = parent.innerText.toLocaleLowerCase();
      foundCookies = innerText.includes('cookie') || innerText.includes('cookies');
      isModal = parent.clientHeight <= COOKIES_MODAL_MAX_HEIGHT;
  
      parent = parent.parentElement;    
  
      if (!isModal || parent === document.body) { break; }
    }
  
    return foundCookies && isModal ? button : null;
  };
  
  const run = () => {
    const checkButtonsIn = (element) => {
      const buttons = Array.from(element.querySelectorAll('button'));
              
      for (let button of buttons) {
        if (isPossibleAcceptCookies(button)) {
          return button;
        }
      }
    };

    const buildRuleAndClick = (button) => {
      if (!button) { return; }

      const selector = buildSelector(button).join(' > ');
      clickElement(button, selector, 0);
    };

    buildRuleAndClick(checkButtonsIn(document.body));

    const observer = new MutationObserver((mutationsList) => {
      const findPossibleCookie = () => {
        for(const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            const nodes = Array.from(mutation.addedNodes);
  
            for (const node of nodes) {
              if (node instanceof HTMLButtonElement && isPossibleAcceptCookies(node)) {
                
                return node;
              } else if (node.nodeType == Node.ELEMENT_NODE) {
                checkButtonsIn(node);
              }
            }
          }
        }
      }
  
      const button = findPossibleCookie();
  
      if (button) {
        buildRuleAndClick(button);
        observer.disconnect();
      }
    });
  
    observer.observe(document, { childList: true, subtree: true });
  
    setTimeout(() => observer.disconnect(), 10 * 1000);
  };
  
  run();
})();
