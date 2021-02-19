// not exactly ad blocking but removing known bad components
 let toRemove = {
   'reddit.com': ['.FooterAppUpsell', '.upsell_banner', '.TopNav__promoButton'],
   'google.com': ['.FooterAppUpsell', '.upsell_banner', '.TopNav__promoButton'],
   'nytimes.com': ['.expanded-dock'],
   'duckduckgo.com': ['.js-atb-banner'],
 }

 let toClick = {
   'quora.com': ['.qu-bg--blue button'],
   'nytimes.com': ['.ReactModal__Overlay button', '#vi_welcome_close'],
   'instagram.com': ['button span[aria-label=Close]'],
   'google.com': ['div[aria-label=promo] g-flat-button', '#continueButton', '.XPromoPopup__actions .XPromoPopup__action:nth-of-type(2) button', '.XPromoPill__closeButton'],
   'reddit.com': ['#continueButton', '.XPromoPopup__actions .XPromoPopup__action:nth-of-type(2) button', '.XPromoPill__closeButton']
 }

 const waitUntilElementExists = (selector, callback) => {
   const el = document.querySelector(selector);
   if (el){
       return callback(el);
   }
   setTimeout(() => waitUntilElementExists(selector, callback), 500);
 }

 const removeElement = (el) => {
   el.parentNode.removeChild(el)
 }

 const clickElement = (el) => {
   el.click()
 }

 let hostname = new URL(window.location.href).hostname;
 if (hostname.startsWith('www.')) {
   hostname = hostname.slice(4)
 }
 if (hostname in toRemove) {
   for(const element of toRemove[hostname]) {
     waitUntilElementExists(element, (el) => removeElement(el));
   }
 }
 if (hostname in toClick) {
   for(const element of toClick[hostname]) {
     waitUntilElementExists(element, (el) => clickElement(el));
   }
 }
