(() => {
  const isProbableAmpPage = () => {
    const url = document.location;

    return url.pathname.includes('/amp/')
        || (url.hostname.startsWith('amp.') && url.hostname.split('.').length > 2);
  };

  const hasAmpAttr = () => {
    return document.documentElement.attributes.getNamedItem('amp')
        || document.documentElement.attributes.getNamedItem('\u26A1');
  }

  const redirectIfInAmpPage = () => {
    if (!isProbableAmpPage() || !hasAmpAttr()) {
      return false;
    }

    const canonicalEl = document.head.querySelector("link[rel~='canonical'][href]");
    if (!canonicalEl) {
      return false;
    }

    try {
      const newURL = new URL(canonicalEl.href);
      if (newURL.toString() === document.referrer || document.referrer === document.location.toString()) {
        return false;
      }

      window.location.replace(newURL);
      return true;
    } catch {
      return false;
    }
  }

  if (redirectIfInAmpPage()) { return; }

  const cleanupAmp = () => {
    document.querySelectorAll('a.amp_r').forEach(function(a) {
      a.href = a.getAttribute('href');
      if (!a.href.indexOf('?') !== -1) a.href = a.href + '?';
      a.removeAttribute('data-amp');
      a.removeAttribute('data-amp-cur');
      a.removeAttribute('ping');
    });

    document.querySelectorAll('span[aria-label=\"AMP logo\"]').forEach(function(a) {
      a.style.display='none';
    });
  }

  document.addEventListener('DOMNodeInserted', cleanupAmp);
  cleanupAmp();
})();
