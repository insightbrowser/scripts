// ==UserScript==
// @name         YouTube ads skip with SponsorBlock
// @version      0.0.1
// @description  Skip ads on YouTube with SponsorBlock.
// @author       Hyperweb
// @match        m.youtube.com
// @match        www.youtube.com
// @match        www.youtube-nocookie.com
// @match        music.youtube.com
// @grant        GM.notification
// @noframes
// ==/UserScript==

const API_URL = "https://sponsor.ajay.app/api/skipSegments/";
const USER_AGENT_QUERY = "userAgent";
const CATEGORY_QUERY = "category";
const CATEGORIES = ["sponsor", "intro"];

const ActionType = {
  Skip: "skip",
  Mute: "mute",
  Full: "full",
  Poi: "poi",
};

let sponsorDataFound = false;
//the actual sponsorTimes if loaded and UUIDs associated with them
let sponsorTimes = null;
//what video id are these sponsors for
let sponsorVideoID = null;
/** Has the sponsor been skipped */
let sponsorSkipped = [];

let sponsorTimesSubmitting = [];

// It resumes with a slightly later time on chromium
let lastTimeFromWaitingEvent = null;

// Is the video currently being switched
let switchingVideos = null;

// Made true every videoID change
let firstEvent = false;

// Used by the play and playing listeners to make sure two aren't
// called at the same time
let lastCheckTime = 0;
let lastCheckVideoTime = -1;
let lastKnownVideoTime;

let waitingMutationObserver;
let waitingElements;

// List of videos that have had event listeners added to them
const videosWithEventListeners = [];

// Skips are scheduled to ensure precision.
// Skips are rescheduled every seeking event.
// Skips are canceled every seeking event
let currentSkipSchedule = null;
let currentSkipInterval = null;

let isAdPlaying = false;

//the video
let video;
let videoMuted = false; // Has it been attempted to be muted
let videoMutationObserver = null;

let isSafari = true;

const waitForElement = async (selector) => {
  return await new Promise((resolve) => {
    waitingElements.push({
      selector,
      callback: resolve,
    });

    if (!waitingMutationObserver) {
      waitingMutationObserver = new MutationObserver(() => {
        const foundSelectors = [];
        for (const { selector, callback } of waitingElements) {
          const element = document.querySelector(selector);
          if (element) {
            callback(element);
            foundSelectors.push(selector);
          }
        }

        waitingElements = waitingElements.filter(
          (element) => !foundSelectors.includes(element.selector)
        );

        if (waitingElements.length === 0) {
          waitingMutationObserver.disconnect();
          waitingMutationObserver = null;
        }
      });

      waitingMutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  });
};

const isVisible = (element) => {
  return element && element.offsetWidth > 0 && element.offsetHeight > 0;
};

const findValidElement = (elements) => {
  for (const el of elements) {
    if (el && isVisible(el)) {
      return el;
    }
  }

  return null;
};

const refreshVideoAttachments = () => {
  const newVideo = findValidElement(document.querySelectorAll("video"));
  if (newVideo && newVideo !== video) {
    video = newVideo;

    if (!videosWithEventListeners.includes(video)) {
      videosWithEventListeners.push(video);

      setupVideoListeners();
    }
  }
};

const addPageListeners = () => {
  const refreshListners = () => {
    if (!isVisible(video)) {
      refreshVideoAttachments();
    }
  };

  document.addEventListener("yt-navigate-finish", refreshListners);
};

const skipToTime = ({ v, skipTime, skippingSegments }) => {
  const autoSkip = true;

  if (autoSkip && v.currentTime !== skipTime[1]) {
    switch (skippingSegments[0].actionType) {
      case ActionType.Poi:
      case ActionType.Skip: {
        // Fix for looped videos not working when skipping to the end #426
        // for some reason you also can't skip to 1 second before the end
        if (v.loop && v.duration > 1 && skipTime[1] >= v.duration - 1) {
          v.currentTime = 0;
        } else if (
          navigator.vendor === "Apple Computer, Inc." &&
          v.duration > 1 &&
          skipTime[1] >= v.duration
        ) {
          // MacOS will loop otherwise #1027
          v.currentTime = v.duration - 0.001;
        } else {
          try {
            const delta = parseInt(skipTime[1] - skipTime[0]);

            GM.notification({
              text: `${ delta } second(s) skipped with SponsorBlock via Hyperweb`,
              position: 'bottom',
              style: 'bar',
              timeout: 5000,
            });
          } catch {}

          v.currentTime = skipTime[1];
        }

        break;
      }
      case ActionType.Mute: {
        if (!v.muted) {
          v.muted = true;
          videoMuted = true;
        }
        break;
      }
    }
  }
};

const updateVirtualTime = () => {
  lastKnownVideoTime = {
    videoTime: video.currentTime,
    preciseTime: performance.now(),
  };
};

/**
 * Update the isAdPlaying flag and hide preview bar/controls if ad is playing
 */
const updateAdFlag = () => {
  isAdPlaying = document.getElementsByClassName("ad-showing").length > 0;
};

const cancelSponsorSchedule = () => {
  if (currentSkipSchedule !== null) {
    clearTimeout(currentSkipSchedule);
    currentSkipSchedule = null;
  }

  if (currentSkipInterval !== null) {
    clearInterval(currentSkipInterval);
    currentSkipInterval = null;
  }
};

const inMuteSegment = (currentTime) => {
  const checkFunction = (segment) =>
    segment.actionType === ActionType.Mute &&
    segment.segment[0] <= currentTime &&
    segment.segment[1] > currentTime;
  return sponsorTimes?.some(checkFunction);
};

/**
 * This makes sure the videoID is still correct and if the sponsorTime is included
 */
const incorrectVideoCheck = (videoID = null, sponsorTime = null) => {
  const currentVideoID = getYouTubeVideoID(document);
  if (
    currentVideoID !== (videoID || sponsorVideoID) ||
    (sponsorTime &&
      (!sponsorTimes ||
        !sponsorTimes?.some((time) => time.segment === sponsorTime.segment)) &&
      !sponsorTimesSubmitting.some(
        (time) => time.segment === sponsorTime.segment
      ))
  ) {
    // Something has really gone wrong
    console.error(
      "[SponsorBlock] The videoID recorded when trying to skip is different than what it should be."
    );
    console.error(
      "[SponsorBlock] VideoID recorded: " +
        sponsorVideoID +
        ". Actual VideoID: " +
        currentVideoID
    );

    // Video ID change occured
    videoIDChange(currentVideoID);

    return true;
  } else {
    return false;
  }
};

/**
 * This returns index if the skip option is not AutoSkip
 *
 * Finds the last endTime that occurs in a segment that the given
 * segment skips into that is part of an AutoSkip category.
 *
 * Used to find where a segment should truely skip to if there are intersecting submissions due to
 * them having different categories.
 *
 * @param sponsorTimes
 * @param index Index of the given sponsor
 * @param hideHiddenSponsors
 */
const getLatestEndTimeIndex = (
  sponsorTimes,
  index,
  hideHiddenSponsors = true
) => {
  // Only combine segments for AutoSkip
  if (
    index == -1 || // ||
    // !shouldAutoSkip(sponsorTimes[index])
    sponsorTimes[index].actionType !== ActionType.Skip
  ) {
    return index;
  }

  // Default to the normal endTime
  let latestEndTimeIndex = index;

  for (let i = 0; i < sponsorTimes?.length; i++) {
    const currentSegment = sponsorTimes[i].segment;
    const latestEndTime = sponsorTimes[latestEndTimeIndex].segment[1];

    if (
      currentSegment[0] <= latestEndTime &&
      currentSegment[1] > latestEndTime &&
      // && (!hideHiddenSponsors || sponsorTimes[i].hidden === SponsorHideType.Visible)
      // && shouldAutoSkip(sponsorTimes[i])
      sponsorTimes[i].actionType === ActionType.Skip
    ) {
      // Overlapping segment
      latestEndTimeIndex = i;
    }
  }

  // Keep going if required
  if (latestEndTimeIndex !== index) {
    latestEndTimeIndex = getLatestEndTimeIndex(
      sponsorTimes,
      latestEndTimeIndex,
      hideHiddenSponsors
    );
  }

  return latestEndTimeIndex;
};

/**
 * Gets just the start times from a sponsor times array.
 * Optionally specify a minimum
 *
 * @param sponsorTimes
 * @param minimum
 * @param hideHiddenSponsors
 * @param includeIntersectingSegments If true, it will include segments that start before
 *  the current time, but end after
 */
const getStartTimes = (
  sponsorTimes,
  includeIntersectingSegments,
  includeNonIntersectingSegments,
  minimum = undefined,
  onlySkippableSponsors = false,
  hideHiddenSponsors = false
) => {
  if (!sponsorTimes) return { includedTimes: [], scheduledTimes: [] };

  const includedTimes = [];
  const scheduledTimes = [];

  const possibleTimes = sponsorTimes.map((sponsorTime) => ({
    ...sponsorTime,
    scheduledTime: sponsorTime.segment[0],
  }));

  // Schedule at the end time to know when to unmute
  sponsorTimes
    .filter((sponsorTime) => sponsorTime.actionType === ActionType.Mute)
    .forEach((sponsorTime) => {
      if (
        !possibleTimes.some(
          (time) => sponsorTime.segment[1] === time.scheduledTime
        )
      ) {
        possibleTimes.push({
          ...sponsorTime,
          scheduledTime: sponsorTime.segment[1],
        });
      }
    });

  for (let i = 0; i < possibleTimes.length; i++) {
    if (
      (minimum === undefined ||
        (includeNonIntersectingSegments &&
          possibleTimes[i].scheduledTime >= minimum) ||
        (includeIntersectingSegments &&
          possibleTimes[i].scheduledTime < minimum &&
          possibleTimes[i].segment[1] > minimum)) &&
      // (!onlySkippableSponsors || shouldSkip(possibleTimes[i])) &&
      !hideHiddenSponsors && // ||
      // possibleTimes[i].hidden === SponsorHideType.Visible) &&
      possibleTimes[i].actionType !== ActionType.Poi
    ) {
      scheduledTimes.push(possibleTimes[i].scheduledTime);
      includedTimes.push(possibleTimes[i]);
    }
  }

  return { includedTimes, scheduledTimes };
};

/**
 * Returns info about the next upcoming sponsor skip
 */
const getNextSkipIndex = (
  currentTime,
  includeIntersectingSegments,
  includeNonIntersectingSegments
) => {
  const { includedTimes: submittedArray, scheduledTimes: sponsorStartTimes } =
    getStartTimes(
      sponsorTimes,
      includeIntersectingSegments,
      includeNonIntersectingSegments
    );
  const { scheduledTimes: sponsorStartTimesAfterCurrentTime } = getStartTimes(
    sponsorTimes,
    includeIntersectingSegments,
    includeNonIntersectingSegments,
    currentTime,
    true,
    false //true
  );

  const minSponsorTimeIndex = sponsorStartTimes.indexOf(
    Math.min(...sponsorStartTimesAfterCurrentTime)
  );
  const endTimeIndex = getLatestEndTimeIndex(
    submittedArray,
    minSponsorTimeIndex
  );

  const {
    includedTimes: unsubmittedArray,
    scheduledTimes: unsubmittedSponsorStartTimes,
  } = getStartTimes(
    sponsorTimesSubmitting,
    includeIntersectingSegments,
    includeNonIntersectingSegments
  );
  const { scheduledTimes: unsubmittedSponsorStartTimesAfterCurrentTime } =
    getStartTimes(
      sponsorTimesSubmitting,
      includeIntersectingSegments,
      includeNonIntersectingSegments,
      currentTime,
      false,
      false
    );

  const minUnsubmittedSponsorTimeIndex = unsubmittedSponsorStartTimes.indexOf(
    Math.min(...unsubmittedSponsorStartTimesAfterCurrentTime)
  );
  const previewEndTimeIndex = getLatestEndTimeIndex(
    unsubmittedArray,
    minUnsubmittedSponsorTimeIndex
  );

  if (
    (minUnsubmittedSponsorTimeIndex === -1 && minSponsorTimeIndex !== -1) ||
    sponsorStartTimes[minSponsorTimeIndex] <
      unsubmittedSponsorStartTimes[minUnsubmittedSponsorTimeIndex]
  ) {
    return {
      array: submittedArray,
      index: minSponsorTimeIndex,
      endIndex: endTimeIndex,
      openNotice: true,
    };
  } else {
    return {
      array: unsubmittedArray,
      index: minUnsubmittedSponsorTimeIndex,
      endIndex: previewEndTimeIndex,
      openNotice: false,
    };
  }
};

const startSponsorSchedule = (
  includeIntersectingSegments = false,
  currentTime = null,
  includeNonIntersectingSegments = true
) => {
  cancelSponsorSchedule();

  // Don't skip if advert playing and reset last checked time
  if (isAdPlaying) {
    // Reset lastCheckVideoTime
    lastCheckVideoTime = -1;
    lastCheckTime = 0;

    return;
  }

  if (!video || video.paused) return;

  if (currentTime === undefined || currentTime === null) {
    const virtualTime =
      lastTimeFromWaitingEvent ??
      (lastKnownVideoTime?.videoTime
        ? (performance.now() - lastKnownVideoTime.preciseTime) / 1000 +
          lastKnownVideoTime.videoTime
        : null);
    if (
      // (lastTimeFromWaitingEvent || !utils.isFirefox()) &&
      !isSafari &&
      virtualTime &&
      Math.abs(virtualTime - video.currentTime) < 0.6
    ) {
      currentTime = virtualTime;
    } else {
      currentTime = video.currentTime;
    }
  }
  lastTimeFromWaitingEvent = null;

  if (videoMuted && !inMuteSegment(currentTime)) {
    video.muted = false;
    videoMuted = false;
  }

  if (incorrectVideoCheck()) return;

  const skipInfo = getNextSkipIndex(
    currentTime,
    includeIntersectingSegments,
    includeNonIntersectingSegments
  );

  if (skipInfo.index === -1) return;

  const currentSkip = skipInfo.array[skipInfo.index];
  const skipTime = [
    currentSkip.scheduledTime,
    skipInfo.array[skipInfo.endIndex].segment[1],
  ];
  const timeUntilSponsor = skipTime[0] - currentTime;
  const videoID = sponsorVideoID;

  // Find all indexes in between the start and end
  let skippingSegments = [skipInfo.array[skipInfo.index]];
  if (skipInfo.index !== skipInfo.endIndex) {
    skippingSegments = [];

    for (const segment of skipInfo.array) {
      if (
        // shouldAutoSkip(segment) &&
        segment.segment[0] >= skipTime[0] &&
        segment.segment[1] <= skipTime[1]
      ) {
        skippingSegments.push(segment);
      }
    }
  }

  const skippingFunction = (forceVideoTime) => {
    let forcedSkipTime = null;
    let forcedIncludeIntersectingSegments = false;
    let forcedIncludeNonIntersectingSegments = true;

    if (incorrectVideoCheck(videoID, currentSkip)) return;
    forceVideoTime ||= video.currentTime;

    if (forceVideoTime >= skipTime[0] && forceVideoTime < skipTime[1]) {
      skipToTime({
        v: video,
        skipTime,
        skippingSegments,
        // openNotice: skipInfo.openNotice,
      });

      if (
        // utils.getCategorySelection(currentSkip.category)?.option ===
        //   CategorySkipOption.ManualSkip ||
        currentSkip.actionType === ActionType.Mute
      ) {
        forcedSkipTime = skipTime[0] + 0.001;
      } else {
        forcedSkipTime = skipTime[1];
        forcedIncludeIntersectingSegments = true;
        forcedIncludeNonIntersectingSegments = false;
      }
    }

    startSponsorSchedule(
      forcedIncludeIntersectingSegments,
      forcedSkipTime,
      forcedIncludeNonIntersectingSegments
    );
  };

  if (timeUntilSponsor < 0.003) {
    skippingFunction(currentTime);
  } else {
    const delayTime = timeUntilSponsor * 1000 * (1 / video.playbackRate);
    if (delayTime < 300) {
      // For Firefox, use interval instead of timeout near the end to combat imprecise video time
      const startIntervalTime = performance.now();
      const startVideoTime = Math.max(currentTime, video.currentTime);
      currentSkipInterval = setInterval(() => {
        const intervalDuration = performance.now() - startIntervalTime;
        if (intervalDuration >= delayTime || video.currentTime >= skipTime[0]) {
          clearInterval(currentSkipInterval);
          if (!video.muted) {
            // Workaround for more accurate skipping on Chromium
            video.muted = true;
            video.muted = false;
          }

          skippingFunction(
            Math.max(
              video.currentTime,
              startVideoTime + (video.playbackRate * intervalDuration) / 1000
            )
          );
        }
      }, 1);
    } else {
      // Schedule for right before to be more precise than normal timeout
      currentSkipSchedule = setTimeout(
        skippingFunction,
        Math.max(0, delayTime - 100)
      );
    }
  }
};

/**
 * Triggered every time the video duration changes.
 * This happens when the resolution changes or at random time to clear memory.
 */
const durationChangeListener = () => {
  updateAdFlag();
};

const setupVideoListeners = () => {
  video.addEventListener("durationchange", durationChangeListener);

  switchingVideos = false;

  video.addEventListener("play", () => {
    // If it is not the first event, then the only way to get to 0 is if there is a seek event
    // This check makes sure that changing the video resolution doesn't cause the extension to think it
    // gone back to the begining
    if (!firstEvent && video.currentTime === 0) return;
    firstEvent = false;

    updateVirtualTime();

    if (switchingVideos) {
      switchingVideos = false;
      // If already segments loaded before video, retry to skip starting segments
      if (sponsorTimes) startSkipScheduleCheckingForStartSponsors();
    }

    // Check if an ad is playing
    updateAdFlag();

    // Make sure it doesn't get double called with the playing event
    if (
      Math.abs(lastCheckVideoTime - video.currentTime) > 0.3 ||
      (lastCheckVideoTime !== video.currentTime &&
        Date.now() - lastCheckTime > 2000)
    ) {
      lastCheckTime = Date.now();
      lastCheckVideoTime = video.currentTime;

      startSponsorSchedule();
    }
  });
  video.addEventListener("playing", () => {
    updateVirtualTime();

    // Make sure it doesn't get double called with the play event
    if (
      Math.abs(lastCheckVideoTime - video.currentTime) > 0.3 ||
      (lastCheckVideoTime !== video.currentTime &&
        Date.now() - lastCheckTime > 2000)
    ) {
      lastCheckTime = Date.now();
      lastCheckVideoTime = video.currentTime;

      startSponsorSchedule();
    }
  });
  video.addEventListener("seeking", () => {
    if (!video.paused) {
      // Reset lastCheckVideoTime
      lastCheckTime = Date.now();
      lastCheckVideoTime = video.currentTime;

      updateVirtualTime();
      lastTimeFromWaitingEvent = null;

      startSponsorSchedule();
    }
  });
  video.addEventListener("ratechange", () => startSponsorSchedule());
  // Used by videospeed extension (https://github.com/igrigorik/videospeed/pull/740)
  video.addEventListener("videoSpeed_ratechange", () => startSponsorSchedule());
  const paused = () => {
    // Reset lastCheckVideoTime
    lastCheckVideoTime = -1;
    lastCheckTime = 0;

    lastKnownVideoTime = {
      videoTime: null,
      preciseTime: null,
    };
    lastTimeFromWaitingEvent = video.currentTime;

    cancelSponsorSchedule();
  };
  video.addEventListener("pause", paused);
  video.addEventListener("waiting", paused);

  startSponsorSchedule();
};

const getYouTubeVideoID = (document) => {
  const url = document.URL;
  // clips should never skip, going from clip to full video has no indications.
  if (url.includes("youtube.com/clip/")) return false;
  // skip to document and don't hide if on /embed/
  if (url.includes("/embed/") && url.includes("youtube.com"))
    return getYouTubeVideoIDFromDocument(document, false);
  // skip to URL if matches youtube watch or invidious or matches youtube pattern
  if (
    !url.includes("youtube.com") ||
    url.includes("/watch") ||
    url.includes("/shorts/") ||
    url.includes("playlist")
  )
    return getYouTubeVideoIDFromURL(url);
  // skip to document if matches pattern
  if (
    url.includes("/channel/") ||
    url.includes("/user/") ||
    url.includes("/c/")
  )
    return getYouTubeVideoIDFromDocument(document);
  // not sure, try URL then document
  return (
    getYouTubeVideoIDFromURL(url) ||
    getYouTubeVideoIDFromDocument(document, false)
  );
};

const getYouTubeVideoIDFromDocument = (document, hideIcon = true) => {
  // get ID from document (channel trailer / embedded playlist)
  const videoURL = document
    .querySelector('[data-sessionlink="feature=player-title"]')
    ?.getAttribute("href");
  if (videoURL) {
    return getYouTubeVideoIDFromURL(videoURL);
  } else {
    return false;
  }
};

const getYouTubeVideoIDFromURL = (url) => {
  if (url.startsWith("https://www.youtube.com/tv#/"))
    url = url.replace("#", "");

  //Attempt to parse url
  let urlObject = null;
  try {
    urlObject = new URL(url);
  } catch (e) {
    console.error("[SB] Unable to parse URL: " + url);
    return false;
  }

  // Check if valid hostname
  if (
    ![
      "m.youtube.com",
      "www.youtube.com",
      "www.youtube-nocookie.com",
      "music.youtube.com",
    ].includes(urlObject.host)
  ) {
    return false;
  }

  //Get ID from searchParam
  if (
    (urlObject.searchParams.has("v") &&
      ["/watch", "/watch/"].includes(urlObject.pathname)) ||
    urlObject.pathname.startsWith("/tv/watch")
  ) {
    const id = urlObject.searchParams.get("v");
    return id.length == 11 ? id : false;
  } else if (
    urlObject.pathname.startsWith("/embed/") ||
    urlObject.pathname.startsWith("/shorts/")
  ) {
    try {
      const id = urlObject.pathname.split("/")[2];
      if (id?.length >= 11) return id.slice(0, 11);
    } catch (e) {
      console.error("[SB] Video ID not valid for " + url);
      return false;
    }
  }
  return false;
};

const resetValues = () => {
  lastCheckTime = 0;
  lastCheckVideoTime = -1;

  //reset sponsor times
  sponsorTimes = null;
  sponsorSkipped = [];

  if (switchingVideos === null) {
    // When first loading a video, it is not switching videos
    switchingVideos = false;
  } else {
    switchingVideos = true;
  }

  firstEvent = true;

  // Reset advert playing flag
  isAdPlaying = false;
};

const setupVideoMutationListener = () => {
  const videoContainer = document.querySelector(".html5-video-container");
  if (!videoContainer || videoMutationObserver !== null) return;

  videoMutationObserver = new MutationObserver(refreshVideoAttachments);

  videoMutationObserver.observe(videoContainer, {
    attributes: true,
    childList: true,
    subtree: true,
  });
};

const getHashParams = () => {
  const windowHash = window.location.hash.slice(1);
  if (windowHash) {
    const params = windowHash.split("&").reduce((acc, param) => {
      const [key, value] = param.split("=");
      const decoded = decodeURIComponent(value);
      try {
        acc[key] = decoded?.match(/{|\[/) ? JSON.parse(decoded) : value;
      } catch (e) {
        console.error(`Failed to parse hash parameter ${key}: ${value}`);
      }

      return acc;
    }, {});

    return params;
  }

  return {};
};

const getHash = async (value, times = 5000) => {
  if (times <= 0) return "";

  let hashHex = value;
  for (let i = 0; i < times; i++) {
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(hashHex).buffer
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  return hashHex;
};

const urlTimeToSeconds = (time) => {
  if (!time) {
    return 0;
  }

  const re = /(?:(\d{1,3})h)?(?:(\d{1,2})m)?(\d+)s?/;
  const match = re.exec(time);

  if (match) {
    const hours = parseInt(match[1] ?? "0", 10);
    const minutes = parseInt(match[2] ?? "0", 10);
    const seconds = parseInt(match[3] ?? "0", 10);

    return hours * 3600 + minutes * 60 + seconds;
  } else if (/\d+/.test(time)) {
    return parseInt(time, 10);
  }
};

const getStartTimeFromUrl = (url) => {
  const urlParams = new URLSearchParams(url);
  const time = urlParams?.get("t") || urlParams?.get("time_continue");

  return urlTimeToSeconds(time);
};

/**
 * Only should be used when it is okay to skip a sponsor when in the middle of it
 *
 * Ex. When segments are first loaded
 */
const startSkipScheduleCheckingForStartSponsors = () => {
  // switchingVideos is ignored in Safari due to event fire order. See #1142
  if ((!switchingVideos || isSafari) && sponsorTimes) {
    // See if there are any starting sponsors
    let startingSegmentTime = getStartTimeFromUrl(document.URL) || -1;
    let found = false;
    let startingSegment = null;
    for (const time of sponsorTimes) {
      if (
        time.segment[0] <= video.currentTime &&
        time.segment[0] > startingSegmentTime &&
        time.segment[1] > video.currentTime &&
        time.actionType !== ActionType.Poi
      ) {
        startingSegmentTime = time.segment[0];
        startingSegment = time;
        found = true;
        break;
      }
    }
    if (!found) {
      for (const time of sponsorTimesSubmitting) {
        if (
          time.segment[0] <= video.currentTime &&
          time.segment[0] > startingSegmentTime &&
          time.segment[1] > video.currentTime &&
          time.actionType !== ActionType.Poi
        ) {
          startingSegmentTime = time.segment[0];
          startingSegment = time;
          found = true;
          break;
        }
      }
    }

    // For highlight category
    const poiSegments = sponsorTimes
      .filter(
        (time) =>
          time.segment[1] > video.currentTime &&
          time.actionType === ActionType.Poi
      )
      .sort((a, b) => b.segment[0] - a.segment[0]);
    for (const time of poiSegments) {
      // const skipOption = utils.getCategorySelection(time.category)?.option;
      // if (skipOption !== CategorySkipOption.ShowOverlay) {
      skipToTime({
        v: video,
        skipTime: time.segment,
        skippingSegments: [time],
        // openNotice: true,
        // unskipTime: video.currentTime,
      });
      // if (skipOption === CategorySkipOption.AutoSkip) break;
      //}
    }

    if (false && startingSegmentTime !== -1) {
      startSponsorSchedule(undefined, startingSegmentTime);
    } else {
      startSponsorSchedule();
    }
  }
};

const retryFetch = () => {
  sponsorDataFound = false;

  setTimeout(() => {
    if (sponsorVideoID && sponsorTimes?.length === 0) {
      sponsorsLookup();
    }
  }, 10000 + Math.random() * 30000);
};

const sponsorsLookup = async (keepOldSubmissions = true) => {
  if (!video || !isVisible(video)) {
    refreshVideoAttachments();
  }
  //there is still no video here
  if (!video) {
    setTimeout(() => sponsorsLookup(), 100);
    return;
  }

  setupVideoMutationListener();

  const response = await getVideoSegments();
  if (response?.ok) {
    const recievedSegments = (await response.json())
      ?.filter((video) => video.videoID === sponsorVideoID)
      ?.map((video) => video.segments)[0];
    if (!recievedSegments || !recievedSegments.length) {
      // return if no video found
      retryFetch();
      return;
    }

    sponsorDataFound = true;

    // Check if any old submissions should be kept
    if (sponsorTimes !== null && keepOldSubmissions) {
      for (let i = 0; i < sponsorTimes.length; i++) {
        if (sponsorTimes[i].source === SponsorSourceType.Local) {
          // This is a user submission, keep it
          recievedSegments.push(sponsorTimes[i]);
        }
      }
    }

    const oldSegments = sponsorTimes || [];
    sponsorTimes = recievedSegments;

    // Hide all submissions smaller than the minimum duration
    // if (Config.config.minDuration !== 0) {
    //   for (const segment of sponsorTimes) {
    //     const duration = segment.segment[1] - segment.segment[0];
    //     if (duration > 0 && duration < Config.config.minDuration) {
    //       segment.hidden = SponsorHideType.MinimumDuration;
    //     }
    //   }
    // }

    if (keepOldSubmissions) {
      for (const segment of oldSegments) {
        const otherSegment = sponsorTimes.find(
          (other) => segment.UUID === other.UUID
        );
        if (otherSegment) {
          // If they downvoted it, or changed the category, keep it
          otherSegment.hidden = segment.hidden;
          otherSegment.category = segment.category;
        }
      }
    }
    startSkipScheduleCheckingForStartSponsors();
  } else if (response?.status === 404) {
    retryFetch();
  }

  // if (Config.config.isVip) {
  //   lockedCategoriesLookup();
  // }
};

const videoIDChange = async (id) => {
  //if the id has not changed return unless the video element has changed
  if (sponsorVideoID === id && (isVisible(video) || !video)) return;

  //set the global videoID
  sponsorVideoID = id;

  resetValues();

  //id is not valid
  if (!id) return;

  sponsorsLookup(id);
};

const getVideoSegments = async () => {
  const hashPrefix = (await getHash(sponsorVideoID, 1)).slice(0, 4);

  const url = new URL(API_URL + hashPrefix);
  // url.searchParams.append(VIDEO_QUERY, videoId);
  url.searchParams.append(USER_AGENT_QUERY, window.navigator.userAgent);
  CATEGORIES.forEach((c) => url.searchParams.append(CATEGORY_QUERY, c));

  const hashParams = getHashParams();
  if (hashParams.requiredSegment) {
    url.searchParams.append("requiredSegment", hashParams.requiredSegment);
  }

  try {
    return await fetch(url.href);
  } catch {
    console.log("Error fetching segments for video");
    return [];
  }
};

const run = async () => {
  waitForElement(".ytp-inline-preview-ui").then(() => {
    refreshVideoAttachments();
  });

  const videoId = getYouTubeVideoID(document);

  if (!videoId) {
    return;
  }

  sponsorsLookup();
};

videoIDChange(getYouTubeVideoID(document));
addPageListeners();
run();
