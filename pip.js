(function() {
  function act() {
    let v = document.querySelector('video');
    v.addEventListener('webkitpresentationmodechanged', (e)=>{
      e.stopPropagation();
      console.log('stop prop');
    }, true);
    v.setAttribute('pip-mode', 'true');
//     setTimeout(()=>{
//       v.webkitSetPresentationMode('picture-in-picture');
//       console.log('pip');
//     }, 1000);
  }
  
  function helper() {
    let vid = document.querySelector('video');
    if (vid && vid.getAttribute('pip-mode') !== 'true') {
      act()
    } 
  }
  
  setInterval(() => helper(), 1000)
})()
