// ==UserScript==
// @name         Roam Quick Note
// @version      0.0.1
// @description  Quick notes selected text to Roam.
// @author       Hyperweb
// @match        *
// @grant        GM.registerButton
// @grant        GM.openInTab
// @noframes
// ==/UserScript==

(() => {
  let selection = '';
  document.onselectionchange = () => {
    if (!document.getSelection()?.toString()) { return; }
    selection = document.getSelection().toString();
  };

  const callback = () => GM.openInTab(`https://roamresearch.com?text=${encodeURIComponent(selection)}#quick-capture`);
  GM.registerButton('roam-quick-note', 'Quick note to Roam', null, callback);
})();
