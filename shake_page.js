(() => {
    var doABarrelRoll = function() {
      document.head.innerHTML+= `<style>
        @-webkit-keyframes shake {
            0% { -webkit-transform: translate(2px, 1px) rotate(0deg); } 
            10% { -webkit-transform: translate(-1px, -2px) rotate(-1deg); }
            20% { -webkit-transform: translate(-3px, 0px) rotate(1deg); }
            30% { -webkit-transform: translate(0px, 2px) rotate(0deg); }
            40% { -webkit-transform: translate(1px, -1px) rotate(1deg); }
            50% { -webkit-transform: translate(-1px, 2px) rotate(-1deg); }
            60% { -webkit-transform: translate(-3px, 1px) rotate(0deg); }
            70% { -webkit-transform: translate(2px, 1px) rotate(-1deg); }
            80% { -webkit-transform: translate(-1px, -1px) rotate(1deg); }
            90% { -webkit-transform: translate(2px, 2px) rotate(0deg); }
            100% { -webkit-transform: translate(1px, -2px) rotate(-1deg); }
        }

        .shake {
            display:inline-block
            -webkit-animation-name: shake;
            -webkit-animation-duration: 0.5s;
            -webkit-transform-origin:50% 50%;
            -webkit-animation-iteration-count: infinite;
        }
      </style>`

      document.body.className += ' shake';
    }

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
