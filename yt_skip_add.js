// ==UserScript==
// @name         Skips YouTube ads
// @version      0.0.1
// @description  Automatically skips YouTube ads
// @author       Hyperweb
// @match        *
// @noframes
// ==/UserScript==

const ADS_CLASS = 'video-ads';
const ADS_SELECTOR = `.${ ADS_CLASS }`;
const SKIP_SELECTOR = '.ytp-ad-skip-button';
const VIDEO_SELECTOR = '.html5-main-video';
const BANNER_OVERLAY_CLASS = 'ytp-ad-overlay-close-button';

const run = () => {
  const tryClick = (attempt, buttonOnly) => {
    if (attempt > 5) { return; }

    const button = document.querySelectorAll(SKIP_SELECTOR)[0];
    const video = document.querySelectorAll(VIDEO_SELECTOR)[0];

    if (video && !buttonOnly) {
      video.currentTime = video.duration;
    }

    if (button) {
      button.click();
    } else {
      setTimeout(() => tryClick(attempt + 1, true), 100);;
    }    
  };

  const skip = () => {
    if (document.querySelectorAll(ADS_SELECTOR)[0]?.innerHTML !== '') {
      let banner = false;
   
      for(let i = 0; i < document.getElementsByClassName(BANNER_OVERLAY_CLASS).length; i++) {
        document.getElementsByClassName(BANNER_OVERLAY_CLASS)[i]?.click();
        banner = true;
      }
   
      if (banner === false) {
        tryClick(0);
      }
    }
  }

  const obsVideoAds = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length === 0) { return; }
      skip();
    });
  });


  const obs = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((added) => {
        const target = added.classList?.contains(ADS_CLASS) ? added : added?.querySelector?.(ADS_SELECTOR);

        if (!target) { return; }

        obsVideoAds.disconnect();
        obsVideoAds.observe(target, {
          childList: true,
          subtree: true,
        });

        skip();
      });
    });
  });

  const container = document.querySelector(ADS_SELECTOR);

  if (container) {
    skip();
    obsVideoAds.observe(container, {
      childList: true,
      subtree: true,
    });
  } else {
    obs.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

};

run();
