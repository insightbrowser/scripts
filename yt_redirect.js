(() => {
  const NO_REDIRECT_PARAM_KEY = 'hyperweb-d-r';
  let lastUrl = location.href;

  const tryRedirect = () => {
    try {
      const url = new URL(location.href);

      url.searchParams.append(NO_REDIRECT_PARAM_KEY, '1');
      history.replaceState({}, '', url.href);
      window.location.href = url.href;
    } catch {}
  };

  const run = () => {
    const threshold = 150;
    const testImage = "http://www.google.com/images/phd/px.gif";
    const dummyImage = new Image();
    
    const testLatency = (cb) => {
      var tStart = new Date().getTime();
    
      dummyImage.src = testImage;
      dummyImage.onload = function() {
        var tEnd = new Date().getTime();
        cb(tEnd-tStart);
      };
    }

    try {
      const url = new URL(location.href);
      const host = url.hostname;
      const isTarget = [ 'm.youtube.com', 'www.youtube.com' ].some((h) => host.includes(h));
      const shouldRedirect = isTarget && url.pathname.startsWith('/watch') && !url.searchParams.has(NO_REDIRECT_PARAM_KEY);

      if (shouldRedirect) {
        testLatency((avg) => {
          if (avg <= threshold) {
            tryRedirect();
          }
        });
      }
    } catch {}
  };

  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      run();
    }
  }).observe(document, { subtree: true, childList: true });

  run();
})();
