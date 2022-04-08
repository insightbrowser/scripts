// ==UserScript==
// @name Sci Hub Injector
// @version 0.1
// @description Adds SciHub links to popular publishing websites to make free access to science even easier.
// @author Felipe
// @match *
// @grant GM.registerButton
// @grant GM.openInTab
// ==/UserScript==

const cb = () => GM.openInTab(`https://sci-hub.hkvisa.net${document.location.href}`);
GM.registerButton('sci-hub', 'Open this page on Sci-Hub', null, cb);
