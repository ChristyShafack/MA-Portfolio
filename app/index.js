import 'utils/polyfill'
import 'utils/scroll'
import 'utils/sw'

import AutoBind from 'auto-bind'
import FontFaceObserver from 'fontfaceobserver/fontfaceobserver.standalone'
import Stats from 'stats.js'

import each from 'lodash/each'

import Detection from 'classes/Detection'

import Semester2 from 'pages/Semester2'
import Semester1 from 'pages/Semester1'
import About from 'pages/About'
import Blog from 'pages/Blog'
import Home from 'pages/Home'

class App {
  constructor () {
    if (IS_DEVELOPMENT && window.location.search.indexOf('fps') > -1) {
      this.createStats()
    }

    AutoBind(this)

    this.content = document.querySelector('.content')
    this.template = this.content.dataset.template

    this.pages = new Map()
    this.pages.set('semester2', new Semester2())
    this.pages.set('semester1', new Semester1())
    this.pages.set('about', new About())
    this.pages.set('blog', new Blog())
    this.pages.set('home', new Home())

    this.page = this.pages.get(this.template)
    this.page.create()
    this.page.show()

    this.addEventListeners()
    this.addLinksEventsListeners()
  }

  createAnalytics () {
    const googleAnalytics = document.createElement('script')

    googleAnalytics.onload = _ => {
      function gtag () {
        // eslint-disable-next-line no-undef
        dataLayer.push(arguments)
      }

      window.dataLayer = window.dataLayer || []

      gtag('js', new Date())
      gtag('config', 'GOOGLE_ANALYTICS')
    }

    googleAnalytics.src = 'https://www.googletagmanager.com/gtag/js?id=GOOGLE_ANALYTICS'

    document.body.appendChild(googleAnalytics)
  }

  createStats () {
    this.stats = new Stats()

    document.body.appendChild(this.stats.dom)
  }

  /**
   * Methods.
   */
  async onChange ({ push = true, url = null }) {
    if (this.isLoading || this.url === url) {
      return
    }

    document.body.style.pointerEvents = 'none'

    this.url = url

    this.isLoading = true

    const request = await window.fetch(url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    const response = await request.text()

    this.onRequest({
      push,
      response,
      url
    })
  }

  async onRequest ({ push, response, url }) {
    const html = document.createElement('div')

    html.innerHTML = response

    const content = html.querySelector('.content')

    if (this.page) {
      await Promise.all([
        this.page.hide(content.dataset.template)
      ])
    }

    document.title = html.querySelector('title').textContent

    if (push) {
      window.history.pushState({}, document.title, url)
    }

    this.content.innerHTML = content.innerHTML
    this.content.dataset.template = content.dataset.template

    this.template = content.dataset.template

    this.page = this.pages.get(this.template)
    this.page.create()

    this.addLinksEventsListeners()

    await this.page.show()

    document.body.style.pointerEvents = ''

    this.isLoading = false
  }

  /**
   * Loop.
   */
  update () {
    if (this.stats) {
      this.stats.begin()
    }

    if (this.page) {
      this.page.update()
    }

    if (this.stats) {
      this.stats.end()
    }

    window.requestAnimationFrame(this.update)
  }

  /**
   * Events.
   */
  onContextMenu (event) {
    event.preventDefault()
    event.stopPropagation()

    return false
  }

  onPopState () {
    this.onChange({
      url: window.location.pathname,
      push: false
    })
  }

  onResize () {
    window.requestAnimationFrame(_ => {
      if (this.page) {
        this.page.onResize()
      }
    })
  }

  onKeyDown (event) {
    if (event.key === 'Tab') {
      event.preventDefault()
    }

    if (event.key === 'ArrowDown') {
      this.page.scroll.target += 100
    } else if (event.key === 'ArrowUp') {
      this.page.scroll.target -= 100
    }
  }

  onFocusIn (event) {
    event.preventDefault()
  }

  onTouchDown (event) {
    event.stopPropagation()

    if (!Detection.isMobile() && event.target.tagName === 'A') return

    if (this.page && this.page.onTouchDown) {
      this.page.onTouchDown(event)
    }
  }

  onTouchMove (event) {
    event.stopPropagation()
    if (this.page && this.page.onTouchDown) {
      this.page.onTouchMove(event)
    }
  }

  onTouchUp (event) {
    event.stopPropagation()

    if (this.page && this.page.onTouchDown) {
      this.page.onTouchUp(event)
    }
  }

  onWheel (event) {
    if (this.page && this.page.onWheel) {
      this.page.onWheel(event)
    }
  }

  /**
   * Listeners.
   */
  addEventListeners () {
    window.addEventListener('popstate', this.onPopState, { passive: true })
    window.addEventListener('resize', this.onResize, { passive: true })

    window.addEventListener('mousedown', this.onTouchDown, { passive: true })
    window.addEventListener('mousemove', this.onTouchMove, { passive: true })
    window.addEventListener('mouseup', this.onTouchUp, { passive: true })

    window.addEventListener('touchstart', this.onTouchDown, { passive: true })
    window.addEventListener('touchmove', this.onTouchMove, { passive: true })
    window.addEventListener('touchend', this.onTouchUp, { passive: true })

    window.addEventListener('mousewheel', this.onWheel, { passive: true })
    window.addEventListener('wheel', this.onWheel, { passive: true })

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('focusin', this.onFocusIn)

    if (Detection.isMobile()) {
      window.oncontextmenu = this.onContextMenu
    }
  }

  addLinksEventsListeners () {
    const links = document.querySelectorAll('a')

    each(links, link => {
      const isLocal = link.href.indexOf(window.location.origin) > -1
      const isAnchor = link.href.indexOf('#') > -1

      if (isLocal) {
        link.onclick = event => {
          event.preventDefault()

          if (!isAnchor) {
            this.onChange({
              url: link.href
            })
          }
        }
      } else if (link.href.indexOf('mailto') === -1 && link.href.indexOf('tel') === -1) {
        link.rel = 'noopener'
        link.target = '_blank'
      }
    })
  }
}

const fontPolysansneutral = new FontFaceObserver('Polysans Neutral')

Promise.all([
  fontPolysansneutral.load()
]).then(_ => {
  window.APP = new App()
}).catch(_ => {
  window.APP = new App()
})

console.log('%c Developed by Christy - https://christyshafack.com/', 'color: #000;')
