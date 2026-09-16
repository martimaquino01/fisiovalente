/* =============================================================
   Fisio Valente — comportamento geral do site
   Sem dependências externas. Todos os módulos são opcionais:
   cada um só corre se os elementos respetivos existirem na página.
   ============================================================= */
(function () {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Fallback de imagens -------------------------------------
     Qualquer <img data-fallback="..."> que falhe (ex.: fotografia remota
     indisponível) passa automaticamente para o placeholder da marca.      */
  document.addEventListener('error', (e) => {
    const el = e.target;
    if (el.tagName !== 'IMG' || el.dataset.failed) return;
    const fb = el.dataset.fallback;
    if (!fb) return;
    el.dataset.failed = '1';
    el.src = fb;
    el.classList.add('is-placeholder');
  }, true);

  // Imagens que já falharam antes deste script (defer) ter corrido.
  const sweepImages = () => {
    $$('img[data-fallback]').forEach((el) => {
      if (el.complete && el.naturalWidth === 0 && !el.dataset.failed) {
        el.dataset.failed = '1';
        el.src = el.dataset.fallback;
        el.classList.add('is-placeholder');
      }
    });
  };
  sweepImages();
  window.addEventListener('load', sweepImages);

  /* ---------- 2. Cabeçalho fixo + navegação móvel ---------- */
  const header = $('.site-header');
  const nav = $('#primary-nav');
  const toggle = $('.nav-toggle');

  if (header) {
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (toggle && nav) {
    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);

    const setNav = (open) => {
      nav.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-visible', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open && window.innerWidth <= 1020);
      if (open) { const first = nav.querySelector('a'); if (first) first.focus(); }
    };
    toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
    backdrop.addEventListener('click', () => setNav(false));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1020) setNav(false); });
  }

  /* ---------- 3. Revelação ao scroll ---------- */
  const revealables = $$('[data-reveal]');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealables.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
      revealables.forEach((el) => io.observe(el));
    }
  }

  /* ---------- 4. Contadores ---------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const format = (n) => n.toLocaleString('pt-PT');
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      if (reduceMotion) { el.textContent = format(target); return; }
      const dur = 1500; const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach((el) => io.observe(el));
  }

  /* ---------- 5. Acordeão (FAQ) ---------- */
  $$('.accordion').forEach((acc) => {
    const triggers = $$('.accordion__trigger', acc);
    triggers.forEach((trigger) => {
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!panel) return;
      const inner = panel.firstElementChild;
      const close = (t, p) => { t.setAttribute('aria-expanded', 'false'); p.style.height = '0px'; };
      const open = (t, p, i) => { t.setAttribute('aria-expanded', 'true'); p.style.height = i.offsetHeight + 'px'; };
      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        if (acc.dataset.single !== 'false') {
          triggers.forEach((t) => {
            if (t === trigger) return;
            const p = document.getElementById(t.getAttribute('aria-controls'));
            if (p) close(t, p);
          });
        }
        isOpen ? close(trigger, panel) : open(trigger, panel, inner);
      });
      window.addEventListener('resize', () => {
        if (trigger.getAttribute('aria-expanded') === 'true') panel.style.height = inner.offsetHeight + 'px';
      });
    });
  });

  /* ---------- 6. Carrossel de testemunhos ---------- */
  $$('[data-slider]').forEach((slider) => {
    const track = $('.testimonial-track', slider);
    const prev = $('[data-slider-prev]', slider);
    const next = $('[data-slider-next]', slider);
    if (!track) return;
    const step = () => {
      const card = track.firstElementChild;
      return card ? card.offsetWidth + 24 : track.clientWidth * 0.8;
    };
    if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  });

  /* ---------- 7. Filtros da galeria ---------- */
  const filters = $$('[data-filter]');
  if (filters.length) {
    const items = $$('.gallery__item');
    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        filters.forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
        const cat = btn.dataset.filter;
        items.forEach((item) => {
          const show = cat === 'todos' || item.dataset.category === cat;
          item.classList.toggle('is-hidden', !show);
        });
        if (window.FVLightbox) window.FVLightbox.refresh();
      });
    });
  }

  /* ---------- 8. Lightbox (imagens + vídeo) ---------- */
  const lightbox = $('#lightbox');
  if (lightbox) {
    const stage = $('.lightbox__media', lightbox);
    const caption = $('figcaption', lightbox);
    let items = [];
    let index = 0;
    let lastFocus = null;

    const collect = () => {
      items = $$('[data-lightbox]').filter((el) => !el.classList.contains('is-hidden'));
    };

    const render = () => {
      const el = items[index];
      if (!el) return;
      const type = el.dataset.lightboxType || 'image';
      const src = el.dataset.lightbox;
      stage.innerHTML = '';
      let node;
      if (type === 'video') {
        node = document.createElement('video');
        node.src = src;
        node.controls = true; node.autoplay = true; node.loop = true; node.playsInline = true;
        node.poster = el.dataset.poster || '';
      } else {
        node = document.createElement('img');
        node.src = src;
        node.alt = el.dataset.caption || '';
        if (el.dataset.fallbackFull) node.dataset.fallback = el.dataset.fallbackFull;
      }
      stage.appendChild(node);
      caption.textContent = el.dataset.caption || '';
      const nav = items.length > 1;
      $('.lightbox__prev', lightbox).hidden = !nav;
      $('.lightbox__next', lightbox).hidden = !nav;
    };

    const open = (el) => {
      collect();
      index = Math.max(0, items.indexOf(el));
      lastFocus = document.activeElement;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      render();
      $('.lightbox__close', lightbox).focus();
    };

    const close = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      const media = stage.firstElementChild;
      if (media && media.tagName === 'VIDEO') media.pause();
      stage.innerHTML = '';
      if (lastFocus) lastFocus.focus();
    };

    const move = (dir) => { index = (index + dir + items.length) % items.length; render(); };

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-lightbox]');
      if (trigger) { e.preventDefault(); open(trigger); }
    });
    $('.lightbox__close', lightbox).addEventListener('click', close);
    $('.lightbox__prev', lightbox).addEventListener('click', () => move(-1));
    $('.lightbox__next', lightbox).addEventListener('click', () => move(1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
    });
    window.FVLightbox = { refresh: collect };
  }

  /* ---------- 9. Vídeo do herói / painéis de vídeo ---------- */
  $$('[data-video-panel]').forEach((panel) => {
    const btn = $('.play-btn', panel);
    const video = $('video', panel);
    const overlay = $('.video-panel__overlay', panel);
    if (!btn || !video) return;
    btn.addEventListener('click', () => {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      video.controls = true;
      video.play();
    });
  });

  const heroVideo = $('[data-hero-video]');
  if (heroVideo && reduceMotion) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }

  /* ---------- 10. Slideshow de reserva (fallback do herói) ---------- */
  const slides = $$('.hero-slides img');
  if (slides.length > 1 && !reduceMotion) {
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    }, 6000);
  }

  /* ---------- 11. Botão voltar ao topo ---------- */
  const toTop = $('.float-btn--top');
  if (toTop) {
    window.addEventListener('scroll', () => {
      toTop.classList.toggle('is-visible', window.scrollY > 700);
    }, { passive: true });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  }

  /* ---------- 12. Horário: destacar o dia de hoje ---------- */
  $$('[data-hours]').forEach((table) => {
    const today = new Date().getDay(); // 0 = domingo
    const row = $(`[data-day="${today}"]`, table);
    if (row) row.classList.add('is-today');
  });

  /* ---------- 13. Ano no rodapé ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- 14. Toast ---------- */
  const toast = $('#toast');
  window.fvToast = (message) => {
    if (!toast) return;
    $('span', toast).textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('is-visible'), 4200);
  };

  /* ---------- 15. Validação de formulários (contacto/newsletter) ---------- */
  const setError = (field, message) => {
    field.classList.toggle('field--error', Boolean(message));
    const box = $('.field__error', field);
    if (box) box.textContent = message || '';
  };

  window.fvValidateField = (input) => {
    const field = input.closest('.field') || input.closest('.checkbox');
    if (!field) return true;
    let message = '';
    const value = (input.value || '').trim();
    if (input.required && (input.type === 'checkbox' ? !input.checked : !value)) {
      message = 'Campo obrigatório.';
    } else if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) {
      message = 'Introduza um email válido.';
    } else if (input.type === 'tel' && value && !/^[+0-9\s().-]{9,20}$/.test(value)) {
      message = 'Introduza um telefone válido.';
    }
    if (field.classList.contains('field')) setError(field, message);
    return !message;
  };

  $$('form[data-validate]').forEach((form) => {
    const fields = $$('input, textarea, select', form).filter((el) => el.type !== 'hidden');
    fields.forEach((input) => {
      input.addEventListener('blur', () => window.fvValidateField(input));
      input.addEventListener('input', () => {
        const field = input.closest('.field');
        if (field && field.classList.contains('field--error')) window.fvValidateField(input);
      });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = fields.map((f) => window.fvValidateField(f)).every(Boolean);
      if (!ok) {
        const first = $('.field--error input, .field--error textarea, .field--error select', form);
        if (first) first.focus();
        return;
      }
      const btn = $('[type="submit"]', form);
      const done = $(form.dataset.success || '#form-success');
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'A enviar…'; }
      // DEMONSTRAÇÃO: sem backend. Ver README para ligar a um serviço de envio.
      setTimeout(() => {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
        form.reset();
        if (done) { done.hidden = false; done.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); }
        window.fvToast('Mensagem enviada. Entraremos em contacto muito em breve.');
      }, 900);
    });
  });

  /* ---------- 16. Navegação interna suave com offset do cabeçalho ---------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    if (!id || id === '#' || id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight + 12 : 0);
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });
})();
