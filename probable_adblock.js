var adBlockers = [
  {
    "site": "twitter.com",
    "adText": "Promoted",
    "adElementSelector": "article"
  },
  {
    "site": "facebook.com",
    "adText": "Sponsored",
    "adElementSelector": "article"
  },
  {
    "site": "reddit.com",
    "adText": "Promoted, Sponsored",
    "adElementSelector": "article"
  },
  {
    "site": "m.facebook.com",
    "adText": "Sponsored",
    "adElementSelector": "article"
  },
  {
    "site": "instagram.com",
    "adText": "Sponsored",
    "adElementSelector": "article"
  },
  {
    "site": "mobile.twitter.com",
    "adText": "Promoted",
    "adElementSelector": "article"
  },
  {
    "site": "amazon.com",
    "adText": "Sponsored",
    "adElementSelector": "div.s-result-item"
  },
  {
    "site": "m.youtube.com",
    "adTextContainer": "ytm-badge",
    "adText": "AD",
    "adElementSelector": "ytm-item-section-renderer"
  },
  {
    "site": "m.youtube.com",
    "adTextContainer": "ytm-badge",
    "adText": "AD",
    "adElementSelector": "ytm-rich-item-renderer"
  },
  {
    "site": "google.com",
    "adText": "Ad,Ad·",
    "adElementSelector": "#tads"
  },
  {
    "site": "google.com",
    "adText": "Ads",
    "adElementSelector": ".mnr-c"
  },
  {
    "site": "google.com",
    "adText": "Ads",
    "adElementSelector": "._-is"
  },
  {
    "site": "google.com",
    "adText": "Ads",
    "adElementSelector": ".commercial-unit-mobile-top"
  }
]


var host = document.location.host.replace('www.', '');

var adBlocks = adBlockers.filter(adBlock => {
  var site = adBlock.site.split(',');
  return site.includes(host);
});

adBlocks.forEach((adBlock) => {
  var adText = adBlock.adText.split(',');
  var adTextContainer = adBlock.adTextContainer || 'span';
  var adElementSelector = adBlock.adElementSelector;

  setInterval(function() {
      var search = adText.map(adText => 'normalize-space()=\'' + adText + '\'').join(' or ');
      var xpath = "//" + adTextContainer + "[" + search + "]";
      var matchingElements = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
      var nodes = []
      while(node = matchingElements.iterateNext()) {
          nodes.push(node)
      }
      adBlockNodes(nodes, adElementSelector);
  }, 1000);
})


function adBlockNodes(nodes, adElementSelector) {
  for (let node of nodes) {
      let adstory = node.closest(adElementSelector)
      
      // Preventing same adstory to be handled more than once
      if (adstory.getAttribute('adblocked') === 'true') {
          continue;
      }
      
      adstory.setAttribute('adblocked', 'true')

      let overlay = document.createElement('div')
      overlay.setAttribute('style', `
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          position: absolute; left: 0; top: 0; right: 0; bottom: 0;
          background: linear-gradient(hsla(0,0%,100%,.9) 0%,#fff);
          z-index: 2147483647`)
      overlay.setAttribute('class', 'adblock')
      let overlaytext = document.createElement('div')
      overlaytext.setAttribute('style', `
          position: absolute; left: 20px; top: 30px;
          font-weight: bold;
          font-size: 24px;
          color:#444;`)
      overlaytext.innerText = 'Ad'
      let overlaytextinner = document.createElement('div')
      overlaytextinner.setAttribute('style', `
          font-weight: normal;
          margin-top: 10px;
          font-size: 16px;`)
          overlaytextinner.innerText = 'Tap to show likely ad.'
      overlay.appendChild(overlaytext)
      overlaytext.appendChild(overlaytextinner)
      overlay.addEventListener("click", (e) => {
          if (adstory.getAttribute('adblock-protected') !== 'true') {
              e.preventDefault();
              let ol = e.target.closest('.adblock');
              ol.parentElement.style.maxHeight = 'none';
              ol.parentElement.style.overflow = 'auto';
              ol.parentNode.removeChild(ol);
              adstory.setAttribute('adblock-protected', 'true')
          }
      });
      if (adstory.querySelectorAll('.adblock').length === 0 && adstory.getAttribute('adblock-protected') !== 'true') {
          adstory.style.position = "relative"
          adstory.style.maxHeight = '120px';
          adstory.style.overflow = 'hidden';
          adstory.insertBefore(overlay, adstory.firstChild)
      }
  }
} 
