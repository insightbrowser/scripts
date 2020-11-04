(function() {
  function act() {
    let v = document.querySelector('video');
    v.addEventListener('webkitpresentationmodechanged', (e)=>e.stopPropagation(), true);
    completion()
  }
  
  function helper() {
    let vid = document.querySelector('video');
    if (vid) {
      act()
    } else {
      setTimeout(() => helper(), 1000)
    }
    
  }
})()
