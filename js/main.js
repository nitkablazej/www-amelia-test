(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const sections = $$('[data-section]');
  const navLinks = $$('[data-nav]');
  const body = document.body;

  /* ---------- Year in footer ---------- */
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Reveal + active section ---------- */
  // telefon/tablet: elementy pojawiają się pojedynczo, gdy wejdą w widok (bez przeskoków)
  const touchMode = matchMedia('(max-width:959px), (hover:none)').matches;
  const ratios = new Map(sections.map(s => [s, 0]));

  function setActive() {
    let best = null, max = 0;
    ratios.forEach((r, el) => { if (r > max) { max = r; best = el; } });
    if (!best) return;
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === best.id));
    body.classList.toggle('dark-nav', best.id === 'courses');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = best.id === 'courses' ? '#0a4a4f' : '#0f737a';
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        ratios.set(e.target, e.intersectionRatio);
        if (!touchMode && e.isIntersecting && e.intersectionRatio > 0.18) e.target.classList.add('in');
      });
      setActive();
    }, { threshold: Array.from({ length: 11 }, (_, i) => i / 10) });
    sections.forEach(s => io.observe(s));
    if (touchMode) {
      const rio = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
      $$('[data-reveal]').forEach(el => rio.observe(el));
    }
  } else {
    sections.forEach(s => s.classList.add('in'));
    $$('[data-reveal]').forEach(el => el.classList.add('in'));
  }
  // hero visible from the start
  requestAnimationFrame(() => { if (!touchMode) $('#hero').classList.add('in'); });

  /* ---------- Scroll progress ---------- */
  const bar = $('#progressBar');
  let ticking = false;
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(updateProgress); ticking = true; }
  }, { passive: true });
  updateProgress();

  /* ---------- Mobile menu ---------- */
  const burger = $('#burger');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width:960px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- Keyboard: J/K and arrows between sections ---------- */
  addEventListener('keydown', e => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    const dir = (e.key === 'j') ? 1 : (e.key === 'k') ? -1 : 0;
    if (!dir) return;
    const i = sections.findIndex(s => (ratios.get(s) || 0) === Math.max(...ratios.values()));
    const next = sections[Math.min(sections.length - 1, Math.max(0, i + dir))];
    next && next.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------- Contact form (EmailJS REST API) ---------- */
  const EMAILJS = {
    service_id: 'service_rwltej7',
    template_id: 'template_3b3gm6e',
    user_id: '_rFim75AUZL2wbLW0'
  };

  const form = $('#contactForm');
  const status = $('#formStatus');
  const btn = $('#submitBtn');
  const emailRe = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

  const setErr = (name, msg) => {
    const el = $(`.err[data-for="${name}"]`, form);
    if (el) el.textContent = msg || '';
    const field = el && el.closest('.field');
    if (field) field.classList.toggle('invalid', !!msg);
  };

  function validate() {
    const v = n => (form.elements[n].value || '').trim();
    const errors = {};
    if (!v('user_name')) errors.user_name = 'Imię jest wymagane!';
    else if (v('user_name').length < 2) errors.user_name = 'Imię jest za krótkie!';

    if (!v('user_email')) errors.user_email = 'E-mail jest wymagany!';
    else if (!emailRe.test(v('user_email'))) errors.user_email = 'Adres e-mail nie jest prawidłowy!';

    if (!v('subject')) errors.subject = 'Temat wiadomości jest wymagany!';
    else if (v('subject').length < 3) errors.subject = 'Temat wiadomości jest za krótki!';

    if (!v('message')) errors.message = 'Treść wiadomości jest wymagana!';
    else if (v('message').length < 3) errors.message = 'Treść wiadomości jest za krótka!';

    if (!form.elements.agree.checked) errors.agree = 'Potwierdzenie jest wymagane!';

    ['user_name', 'user_email', 'subject', 'message', 'agree'].forEach(n => setErr(n, errors[n]));
    return errors;
  }

  const showStatus = (cls, msg) => { status.className = 'form-status ' + cls; status.textContent = msg; };

  form.addEventListener('input', () => { if (status.textContent) showStatus('', ''); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.elements.website.value) return; // honeypot
    const errors = validate();
    if (Object.keys(errors).length) {
      const first = form.querySelector('.invalid input, .invalid textarea') || form.elements.agree;
      first.focus({ preventScroll: false });
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'Wysyłanie…';
    showStatus('', '');

    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...EMAILJS,
          template_params: {
            user_name: form.elements.user_name.value.trim(),
            user_email: form.elements.user_email.value.trim(),
            subject: form.elements.subject.value.trim(),
            message: form.elements.message.value.trim()
          }
        })
      });
      if (!res.ok) throw new Error(await res.text());
      form.reset();
      showStatus('ok', 'Super! Twoja wiadomość została wysłana.');
    } catch (err) {
      console.error(err);
      showStatus('fail', 'Wystąpił problem z formularzem – proszę o kontakt telefoniczny lub mailowy na dane obok.');
    } finally {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Wyślij';
    }
  });
})();
