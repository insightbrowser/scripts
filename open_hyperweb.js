try {
  [ ...document.getElementsByTagName('a') ].forEach(a => {
    if (a.href.includes('insightbrowser')) {
        a.href = a.href.replace('insightbrowser', 'hyperweb')
    }
  })
} catch {}
