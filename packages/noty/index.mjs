const styles = `

.noty {
  list-style: none;
  margin: 0;
  padding:0;
  position: fixed;
  top: 5vh;
  right: 20px;
  width: 20vw;
  min-width: 180px;
  will-change: transform;
  z-index: 99999;
}
.noty__container-mes {
  padding: 5px 0;
  box-sizing: border-box;
  transform: translateX(0%);
  transition: .5s ease;
}
.noty__container-mes.closing {
  transform: translateX(140%);
}
.noty__mes {
  background: #fff;
  border-radius: 3px;
  box-shadow: 0 5px 14px -4px rgba(0, 0, 0, .2), 0 5px 25px 0 rgba(0, 0, 0, .1);
  overflow: hidden;
  font-size: .875em;
  padding: 7px 0;
}
.noty__mes.noty--error {
  background: #bb3434;
  color: #fff;
}
.noty__mes.noty--info {
  background: #1f5fb9;
  color: #fff;
}
.noty__mes.noty--warn {
  background: #ffb100;
  color: #000;
}
.noty__mes > *:not(.noty__close) {
  padding: 2px 15px;
  margin-top: 2px;
  line-height: 1.35em;
}
.noty__mes > *:nth-child(2) {
  padding-top: 7px;
}
.noty__mes > *:last-child {
  padding-bottom: 7px;
}

.noty__mes h4 {
  font-size: 1.125em;
  line-height: 1em;
  margin: 0px 0 0px;
  color: inherit;
}
.noty__text {
  font-size: .875em;
}
.noty__close {
  float: right;
  width: 32px;
  height: 32px;
  position: relative;
  cursor: pointer;
}
.noty__close:before,
.noty__close:after {
  content: '';
  position: absolute;
  width: 16px;
  height: 2px;
  background: currentColor;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  transition: .13s ease;
}
.noty__close:before {
  transform: rotate(45deg);
}
.noty__close:after {
  transform: rotate(-45deg);
}
.noty__close:hover:before,
.noty__close:hover:after{
  transform: rotate(0);
}
.noty__footer {
  display: flex;
  justify-content: space-between;
}
.noty__footer::after {
  content: '';
}
.noty__footer span {
  color: #0076de;
  text-transform: uppercase;
  padding: 4px 6px;
  cursor: pointer;
  font-size: .75em;
}
.noty__footer span:hover {
  color: #2d9dff;
}
`

const notyId = 'QsdaDRW'
let lastMsg = 0;
const MSG_INTERVAL = 200
let timeToClose = 8000

class Noty {
  constructor() {
    if (arguments[arguments.length - 1] instanceof Object) {
      this.options = arguments[arguments.length - 1]
    } else {
      this.options = {}
    }
    this.createContainer()

    let time = Date.now()
    if (lastMsg && time - lastMsg < MSG_INTERVAL) {
      let diff = MSG_INTERVAL - (time - lastMsg)

      setTimeout( () => {
        this.createMessage(...arguments)
      }, diff);

      if (time - lastMsg < 0) {
        lastMsg += MSG_INTERVAL
      } else {
        lastMsg += diff
      }
    } else{
      lastMsg = time
      this.createMessage(...arguments)
    }
  }

  static Error() {
    if (arguments[arguments.length - 1] instanceof Object) {
      arguments[arguments.length - 1].class = (arguments[arguments.length - 1].class || '') + ' noty--error'

      return new Noty(...arguments)
    } else {
      var options = {
        class: 'noty--error'
      }
      return new Noty(...arguments, options)
    }
  }
  static Info() {
    if (arguments[arguments.length - 1] instanceof Object) {
      arguments[arguments.length - 1].class = (arguments[arguments.length - 1].class || '') + ' noty--info'

      return new Noty(...arguments)
    } else {
      var options = {
        class: 'noty--info'
      }
      return new Noty(...arguments, options)
    }
  }
  static Warn() {
    if (arguments[arguments.length - 1] instanceof Object) {
      arguments[arguments.length - 1].class = (arguments[arguments.length - 1].class || '') + ' noty--warn'

      return new Noty(...arguments)
    } else {
      var options = {
        class: 'noty--warn'
      }
      return new Noty(...arguments, options)
    }
  }
  static Styles(arg) {
    const el = document.createElement('style')
    el.innerText = arg
    document.querySelector('head').appendChild(el)
  }
  static TimeToClose(val) {
    timeToClose = val
  }
  createMessage(head, text) {

    if (text instanceof Object)
      text = null

    const mesContain = this.createEl('','li')
    mesContain.className = 'noty__container-mes'

    const mes = this.createEl('')
    mes.className = 'noty__mes ' + (this.options.class || '')

    const close = this.createEl('')
    close.className = 'noty__close'

    mes.appendChild(close)
    mes.appendChild(this.createEl(head, 'h4'))

    if (text)
      mes.appendChild(this.createEl(text))
    mesContain.appendChild(mes)

    if (this.options.buttons) {
      let { buttons } = this.options

      const footer = this.createEl()
      footer.className = 'noty__footer'

      mes.appendChild(footer)

      const callback = fn => {
        fn()
        closeMessage.call(this)
      }

      buttons = buttons.map(item => {
        let button = this.createEl(item.title, 'span')
        footer.appendChild(button)

        button.addEventListener('click', callback.bind(null, item.callback))
        return button
      })
      this.options.buttons = function(){
        buttons.forEach(item => {
          item.removeEventListener('click', callback)
        })
      }

    }

    mesContain.classList.add('closing')
    this.container.appendChild(mesContain)

    requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          mesContain.classList.remove('closing')
        })
      })

    close.addEventListener('click', closeMessage.bind(this))

    function closeMessage(){
      close.removeEventListener('click', closeMessage)
      if (this.options.buttons)
        this.options.buttons()

      mesContain.classList.add('closing')
      mesContain.style.width = mesContain.offsetWidth + 'px'
      mesContain.style.height = mesContain.offsetHeight + 'px'

      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          mesContain.style.height = 0
          mesContain.style.padding = 0
        })
      })

      setTimeout(()=>{
        mesContain.remove()
      },1000)
    }

    setTimeout(closeMessage.bind(this), this.options.timeToClose || timeToClose)
  }

  createEl(text = '', tag = 'div') {
    const el = document.createElement(tag)
    el.innerHTML = text
    return el;
  }
  createContainer(){
    this.container = document.getElementById(notyId)
    if (this.container) return
    const ul = document.createElement('ul')
    this.container = ul
    ul.className = 'noty'
    ul.id = notyId

    document.body.appendChild(this.container)
    document.querySelector('head').insertBefore(this.createEl(styles + this.options.styles,'style'),document.head.firstChild)
  }
}

window.Noty = Noty
