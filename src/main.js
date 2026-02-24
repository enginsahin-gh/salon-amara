/* ═══════════════════════════════════════════
   SALON AMARA — Main JavaScript
   Content loaded from CMS JSON files
   ═══════════════════════════════════════════ */

// ─── Content loading helpers ───
async function loadJSON(path) {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function loadFolder(path) {
  // Load index file that lists all content files
  try {
    const res = await fetch(path)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

// ─── Intersection Observer for reveals ───
function initReveals() {
  const els = document.querySelectorAll('.reveal')
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0
        setTimeout(() => {
          entry.target.classList.add('reveal--visible')
        }, parseInt(delay))
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
  els.forEach(el => observer.observe(el))
}

// ─── Navigation ───
function initNav() {
  const nav = document.getElementById('nav')
  const burger = document.getElementById('burger')
  const menu = document.getElementById('mobile-menu')
  const links = menu.querySelectorAll('.mobile-menu__link, .mobile-menu__cta')
  let open = false

  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 60)
  }, { passive: true })

  burger.addEventListener('click', () => {
    open = !open
    burger.classList.toggle('nav__burger--open', open)
    menu.classList.toggle('mobile-menu--open', open)
    document.body.style.overflow = open ? 'hidden' : ''
  })

  links.forEach(link => {
    link.addEventListener('click', () => {
      if (open) {
        open = false
        burger.classList.remove('nav__burger--open')
        menu.classList.remove('mobile-menu--open')
        document.body.style.overflow = ''
      }
    })
  })
}

// ─── Magnetic buttons ───
function initMagneticButtons() {
  if (window.innerWidth < 768) return
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0,0)'
    })
  })
}

// ─── Service accordions ───
function initAccordions() {
  document.querySelectorAll('.service-accordion__trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const accordion = trigger.closest('.service-accordion')
      const wasActive = accordion.classList.contains('service-accordion--active')
      document.querySelectorAll('.service-accordion--active').forEach(a => {
        a.classList.remove('service-accordion--active')
      })
      if (!wasActive) {
        accordion.classList.add('service-accordion--active')
      }
    })
  })
}

// ─── Opening hours from JSON ───
async function initHours() {
  const table = document.getElementById('hours-table')
  if (!table) return

  const hours = await loadJSON('/content/settings/hours.json')
  if (!hours) return

  const dayMap = [
    { key: 'maandag', label: 'Maandag', dayNum: 1 },
    { key: 'dinsdag', label: 'Dinsdag', dayNum: 2 },
    { key: 'woensdag', label: 'Woensdag', dayNum: 3 },
    { key: 'donderdag', label: 'Donderdag', dayNum: 4 },
    { key: 'vrijdag', label: 'Vrijdag', dayNum: 5 },
    { key: 'zaterdag', label: 'Zaterdag', dayNum: 6 },
    { key: 'zondag', label: 'Zondag', dayNum: 0 }
  ]

  const today = new Date().getDay()

  table.innerHTML = dayMap.map(d => {
    const h = hours[d.key]
    const isToday = d.dayNum === today
    const time = h.gesloten ? 'Gesloten' : `${h.open} - ${h.sluit}`
    const extra = (d.key === 'donderdag' || d.key === 'vrijdag') && !h.gesloten ? ' (koopavond)' : ''
    return `
      <div class="hours__row ${isToday ? 'hours__row--today' : ''}">
        <span class="hours__day">${d.label}${isToday ? '<span class="hours__today-badge">Vandaag</span>' : ''}</span>
        <span class="hours__time">${time}${extra}</span>
      </div>
    `
  }).join('')
}

// ─── Review stars ───
function initStars() {
  document.querySelectorAll('.review-card__stars').forEach(container => {
    const count = parseInt(container.dataset.stars) || 5
    container.innerHTML = Array.from({ length: count }, () =>
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
    ).join('')
  })
}

// ─── Load dynamic content: announcements ───
async function initAnnouncements() {
  try {
    const data = await loadFolder('/content/announcements/index.json')
    if (!data || !data.length) return

    const bar = document.getElementById('announcement-bar')
    const now = Date.now()

    const active = data.filter(a => {
      if (!a.actief) return false
      if (a.startDatum && new Date(a.startDatum).getTime() > now) return false
      if (a.eindDatum && new Date(a.eindDatum).getTime() < now) return false
      const id = a.tekst.slice(0, 20).replace(/\s+/g, '-')
      if (a.dismissible && localStorage.getItem(`announcement-${id}-dismissed`)) return false
      return true
    })

    if (!active.length) return

    const ann = active[0]
    const annId = ann.tekst.slice(0, 20).replace(/\s+/g, '-')
    bar.style.display = 'block'
    bar.innerHTML = `
      <div class="announcement-bar__item announcement-bar__item--${ann.type || 'info'}">
        <span>${ann.tekst}</span>
        ${ann.dismissible !== false ? `<button class="announcement-bar__close" data-id="${annId}" aria-label="Sluiten">&times;</button>` : ''}
      </div>
    `

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.classList.add('announcement-bar--visible')
        document.body.classList.add('has-announcement')
      })
    })

    bar.querySelector('.announcement-bar__close')?.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id
      localStorage.setItem(`announcement-${id}-dismissed`, '1')
      bar.classList.remove('announcement-bar--visible')
      document.body.classList.remove('has-announcement')
      setTimeout(() => { bar.style.display = 'none' }, 500)
    })
  } catch (e) {
    // Non-critical
  }
}

// ─── Load dynamic content: vacatures ───
async function initVacatures() {
  try {
    const data = await loadFolder('/content/vacatures/index.json')
    if (!data || !data.length) return

    const active = data.filter(v => v.actief)
    if (!active.length) return

    const navLink = document.getElementById('nav-vacatures')
    const badge = document.getElementById('nav-vacatures-badge')
    if (navLink) {
      navLink.style.display = ''
      badge.textContent = active.length
    }

    const footerSection = document.getElementById('footer-vacatures')
    const footerList = document.getElementById('footer-vacatures-list')
    if (footerSection && footerList) {
      footerSection.style.display = ''
      footerList.innerHTML = active.map(v => `
        <div class="vacature-card">
          <h4 class="vacature-card__title">${v.titel}</h4>
          <div class="vacature-card__hours">${v.uren}</div>
          <p class="vacature-card__desc">${v.omschrijving}</p>
          <div class="vacature-card__contact">${v.contactMethode}</div>
        </div>
      `).join('')
    }
  } catch (e) {
    // Non-critical
  }
}

// ─── Smooth scroll for anchor links ───
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'))
      if (target) {
        e.preventDefault()
        const offset = document.body.classList.contains('has-announcement') ? 110 : 70
        const top = target.getBoundingClientRect().top + window.scrollY - offset
        window.scrollTo({ top, behavior: 'smooth' })
      }
    })
  })
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  initReveals()
  initNav()
  initMagneticButtons()
  initAccordions()
  initHours()
  initStars()
  initSmoothScroll()
  initAnnouncements()
  initVacatures()
})
