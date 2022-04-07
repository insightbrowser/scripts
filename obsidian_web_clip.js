// ==UserScript==
// @name         Obsidian Web Clipper
// @version      0.0.1
// @description  Save articles and pages from the web
// @author       Felipe
// @match        *
// @grant        GM.registerButton
// @noframes
// ==/UserScript==

Promise.all([import('https://unpkg.com/turndown@6.0.0?module'), import('https://unpkg.com/@tehshrike/readability@0.2.0'), ]).then(async ([{
    default: Turndown
}, {
    default: Readability
}]) => {
  /* Optional vault name */
  const vault = "";

  /* Optional folder name such as "Clippings/" */
  const folder = "";

  /* Optional tags  */
  const tags = "#clippings";

  const run = () => {
    function getSelectionHtml() {
      var html = "";
      if (typeof window.getSelection != "undefined") {
          var sel = window.getSelection();
          if (sel.rangeCount) {
              var container = document.createElement("div");
              for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                  container.appendChild(sel.getRangeAt(i).cloneContents());
              }
              html = container.innerHTML;
          }
      } else if (typeof document.selection != "undefined") {
          if (document.selection.type == "Text") {
              html = document.selection.createRange().htmlText;
          }
      }
      return html;
    }
    
    const selection = getSelectionHtml();
    
    const {
        title,
        byline,
        content
    } = new Readability(document.cloneNode(true)).parse();
    
    function getFileName(fileName) {
      var userAgent = window.navigator.userAgent,
          platform = window.navigator.platform,
          windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    
      if (windowsPlatforms.indexOf(platform) !== -1) {
        fileName = fileName.replace(':', '').replace(/[/\\?%*|"<>]/g, '-');
      } else {
        fileName = fileName.replace(':', '').replace(/\//g, '-').replace(/\\/g, '-');
      }
      return fileName;
    }
    const fileName = getFileName(title);
    
    if (selection) {
        var markdownify = selection;
    } else {
        var markdownify = content;
    }
    
    if (vault) {
        var vaultName = '&vault=' + encodeURIComponent(`${vault}`);
    } else {
        var vaultName = '';
    }
    
    const markdownBody = new Turndown({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
    }).turndown(markdownify);
    
    var date = new Date();
    
    function convertDate(date) {
      var yyyy = date.getFullYear().toString();
      var mm = (date.getMonth()+1).toString();
      var dd  = date.getDate().toString();
      var mmChars = mm.split('');
      var ddChars = dd.split('');
      return yyyy + '-' + (mmChars[1]?mm:"0"+mmChars[0]) + '-' + (ddChars[1]?dd:"0"+ddChars[0]);
    }
    
    const today = convertDate(date);
    
    const fileContent = 
        "author:: " + byline + "\n"
        + "source:: [" + title + "](" + document.URL + ")\n"
        + "clipped:: [[" + today + "]]\n"
        + "published:: \n\n" 
        + tags + "\n\n"
        + markdownBody ;
    
    document.location.href = "obsidian://new?"
      + "file=" + encodeURIComponent(folder + fileName)
      + "&content=" + encodeURIComponent(fileContent)
      + vaultName ;
  };

  GM.registerButton({
    id: 'obsidia-web-clip',
    caption: 'Send clip to Obsidian',
    callback: run,
  });
});
