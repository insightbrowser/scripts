

(() => {
    var doABarrelRoll = function(){var a="-webkit-",b='transform:rotate(1turn);',c='transition:4s;';document.head.innerHTML+='<style>body{'+a+b+a+c+b+c}

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      doABarrelRoll();
    } else {
      document.addEventListener(
        'DOMContentLoaded',
        doABarrelRoll,
        false,
      );
    }
})();
