try {
  const array = Array.from(document.getElementsByTagName('a'));
  array.forEach(a => {
    if (a.href.includes('insightbrowser://open-augmentation')) {
      a.href = a.href.replace('insightbrowser', 'hyperweb');
    }
  })
} catch {}
