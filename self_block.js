(() => {
    var selfBlockPage = function() {
      let overlay = document.createElement('div')
      overlay.setAttribute('style', `
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          position: fixed; left: 0; top: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.95);
          z-index: 2147483647`)
      overlay.setAttribute('class', 'adblock')
      let overlaytext = document.createElement('div')
      overlaytext.setAttribute('style', `
          position: absolute; left: 20px; top: 30px;
          font-weight: bold;
          font-size: 24px;
          color:#444;`)
      overlaytext.innerText = 'Self-blocked'
      overlay.appendChild(overlaytext)
      document.body.appendChild(overlay)
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      selfBlockPage();
    } else {
      document.addEventListener(
        'DOMContentLoaded',
        selfBlockPage,
        false,
      );
    }
})();
