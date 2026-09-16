/* =============================================================
   Fisio Valente — motor de marcações (demonstração)
   -------------------------------------------------------------
   Assistente de 4 passos: serviço → profissional/data/hora →
   dados → confirmação. Funciona inteiramente no navegador.
   Para produção, substituir sendBooking() por um POST à API da
   clínica ou a um serviço de formulários (ver README).
   ============================================================= */
(function () {
  'use strict';

  const root = document.getElementById('booking');
  if (!root) return;

  const $  = (s, c = root) => c.querySelector(s);
  const $$ = (s, c = root) => Array.from(c.querySelectorAll(s));

  /* ---------- Configuração da clínica ---------- */
  const CLINIC = {
    name: 'Fisio Valente — Centro Terapêutico',
    address: 'Rua Abílio Gouveia n.º 5, 8700 Olhão, Algarve',
    email: 'geral@fisiovalente.pt',
    phone: '+351 289 000 000',
  };

  // 0 = domingo … 6 = sábado
  const OPENING = {
    1: [['09:00', '13:00'], ['14:30', '20:00']],
    2: [['09:00', '13:00'], ['14:30', '20:00']],
    3: [['09:00', '13:00'], ['14:30', '20:00']],
    4: [['09:00', '13:00'], ['14:30', '20:00']],
    5: [['09:00', '13:00'], ['14:30', '19:00']],
    6: [['09:00', '13:00']],
    0: [],
  };

  const CATEGORIES = [
    { id: 'fisioterapia', label: 'Fisioterapia' },
    { id: 'massagem', label: 'Massagens & Terapias' },
    { id: 'exercicio', label: 'Exercício & Pilates' },
    { id: 'nutricao', label: 'Nutrição' },
    { id: 'psicologia', label: 'Psicologia' },
  ];

  const SERVICES = [
    { id: 'fisio-primeira', cat: 'fisioterapia', name: 'Avaliação inicial de Fisioterapia', duration: 60, price: 45, note: 'Inclui plano de tratamento personalizado' },
    { id: 'fisio-sessao', cat: 'fisioterapia', name: 'Sessão de Fisioterapia', duration: 45, price: 35, note: 'Terapia manual, eletroterapia e exercício' },
    { id: 'fisio-desportiva', cat: 'fisioterapia', name: 'Reabilitação desportiva', duration: 60, price: 45, note: 'Recuperação de lesão e retorno à prática' },
    { id: 'fisio-domicilio', cat: 'fisioterapia', name: 'Fisioterapia ao domicílio', duration: 60, price: 55, note: 'Sujeito a disponibilidade e zona (Olhão e arredores)' },
    { id: 'massagem-terapeutica', cat: 'massagem', name: 'Massagem terapêutica', duration: 50, price: 38 },
    { id: 'massagem-relax', cat: 'massagem', name: 'Massagem de relaxamento', duration: 60, price: 40 },
    { id: 'massagem-desportiva', cat: 'massagem', name: 'Massagem desportiva', duration: 50, price: 40 },
    { id: 'pressoterapia', cat: 'massagem', name: 'Pressoterapia', duration: 40, price: 30, note: 'Drenagem e circulação' },
    { id: 'auriculo', cat: 'massagem', name: 'Auriculoterapia', duration: 30, price: 25 },
    { id: 'mesoterapia', cat: 'massagem', name: 'Mesoterapia', duration: 40, price: 45 },
    { id: 'treino-pt', cat: 'exercicio', name: 'Treino personalizado', duration: 60, price: 30 },
    { id: 'pilates', cat: 'exercicio', name: 'Pilates clínico', duration: 55, price: 28, note: 'Individual ou dueto' },
    { id: 'senior', cat: 'exercicio', name: 'Mobilidade sénior', duration: 45, price: 25 },
    { id: 'nutricao-primeira', cat: 'nutricao', name: 'Consulta de nutrição — 1.ª consulta', duration: 60, price: 45 },
    { id: 'nutricao-seguimento', cat: 'nutricao', name: 'Consulta de nutrição — seguimento', duration: 30, price: 30 },
    { id: 'psico-individual', cat: 'psicologia', name: 'Consulta de psicologia', duration: 50, price: 50 },
    { id: 'psico-casal', cat: 'psicologia', name: 'Terapia de casal', duration: 75, price: 70 },
  ];

  const PROFESSIONALS = [
    { id: 'any', name: 'Sem preferência', role: 'Atribuímos o profissional disponível', cats: ['*'] },
    { id: 'ana', name: 'Ana Valente', role: 'Fisioterapeuta · Diretora clínica', cats: ['fisioterapia', 'exercicio'] },
    { id: 'ricardo', name: 'Ricardo Matos', role: 'Fisioterapeuta desportivo', cats: ['fisioterapia', 'massagem', 'exercicio'] },
    { id: 'sofia', name: 'Sofia Brito', role: 'Massagista terapêutica', cats: ['massagem'] },
    { id: 'marta', name: 'Marta Nunes', role: 'Psicóloga clínica', cats: ['psicologia'] },
    { id: 'joao', name: 'João Correia', role: 'Nutricionista', cats: ['nutricao'] },
  ];

  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DOW_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  /* ---------- Estado ---------- */
  const state = {
    step: 1,
    service: null,
    professional: 'any',
    date: null,      // 'YYYY-MM-DD'
    time: null,      // 'HH:MM'
    first: 'sim',
    data: {},
  };

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const getService = () => SERVICES.find((s) => s.id === state.service) || null;
  const getPro = () => PROFESSIONALS.find((p) => p.id === state.professional) || PROFESSIONALS[0];

  const money = (v) => `${v.toFixed(2).replace('.', ',')} €`;
  const prettyDate = (isoStr) => {
    if (!isoStr) return '—';
    const d = parseISO(isoStr);
    return `${DOW_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  };

  /* ---------- Disponibilidade simulada, mas estável ----------
     O mesmo dia devolve sempre os mesmos horários ocupados,
     para a demonstração se comportar de forma credível.        */
  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  };

  const slotsFor = (isoStr, service, proId) => {
    const d = parseISO(isoStr);
    const ranges = OPENING[d.getDay()] || [];
    const step = 30;
    const out = [];
    const now = new Date();
    ranges.forEach(([from, to]) => {
      const [fh, fm] = from.split(':').map(Number);
      const [th, tm] = to.split(':').map(Number);
      let minutes = fh * 60 + fm;
      const end = th * 60 + tm;
      while (minutes + (service ? service.duration : 45) <= end) {
        const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
        const mm = String(minutes % 60).padStart(2, '0');
        const time = `${hh}:${mm}`;
        const slotDate = new Date(d); slotDate.setHours(Number(hh), Number(mm), 0, 0);
        const past = slotDate.getTime() < now.getTime() + 2 * 3600 * 1000;
        const busy = hash(`${isoStr}|${time}|${proId}`) < 0.38;
        out.push({ time, available: !past && !busy });
        minutes += step;
      }
    });
    return out;
  };

  const dayHasSlots = (dateObj) => {
    const s = iso(dateObj);
    return slotsFor(s, getService(), state.professional).some((x) => x.available);
  };

  /* ---------- Passo 1: serviços ---------- */
  const serviceList = $('#service-list');
  const serviceFilters = $('#service-filters');

  function renderServices(filter = 'todos') {
    serviceList.innerHTML = '';
    SERVICES.filter((s) => filter === 'todos' || s.cat === filter).forEach((s) => {
      const label = document.createElement('label');
      label.className = 'option';
      label.innerHTML = `
        <input type="radio" name="servico" value="${s.id}" ${state.service === s.id ? 'checked' : ''}>
        <span class="option__box">
          <span>
            <strong>${s.name}</strong>
            <span>${s.duration} min · ${money(s.price)}${s.note ? ` · ${s.note}` : ''}</span>
          </span>
          <span class="tick" aria-hidden="true"></span>
        </span>`;
      label.querySelector('input').addEventListener('change', () => {
        state.service = s.id;
        const pro = getPro();
        if (pro.id !== 'any' && !pro.cats.includes('*') && !pro.cats.includes(s.cat)) state.professional = 'any';
        state.time = null;
        renderProfessionals();
        renderSummary();
        updateNav();
      });
      serviceList.appendChild(label);
    });
  }

  CATEGORIES.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.cat = c.id; b.textContent = c.label;
    serviceFilters.appendChild(b);
  });
  serviceFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    $$('button', serviceFilters).forEach((b) => b.classList.toggle('is-active', b === btn));
    renderServices(btn.dataset.cat || 'todos');
  });

  /* ---------- Passo 2: profissional, data e hora ---------- */
  const proList = $('#pro-list');

  function renderProfessionals() {
    const service = getService();
    proList.innerHTML = '';
    PROFESSIONALS.filter((p) => !service || p.cats.includes('*') || p.cats.includes(service.cat)).forEach((p) => {
      const label = document.createElement('label');
      label.className = 'option';
      label.innerHTML = `
        <input type="radio" name="profissional" value="${p.id}" ${state.professional === p.id ? 'checked' : ''}>
        <span class="option__box">
          <span class="option__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
          <span>
            <strong>${p.name}</strong>
            <span>${p.role}</span>
          </span>
          <span class="tick" aria-hidden="true"></span>
        </span>`;
      label.querySelector('input').addEventListener('change', () => {
        state.professional = p.id;
        state.time = null;
        renderCalendar();
        renderSlots();
        renderSummary();
        updateNav();
      });
      proList.appendChild(label);
    });
  }

  const calendarEl = $('#calendar');
  let cursor = new Date();
  cursor.setDate(1);

  function renderCalendar() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const max = new Date(today); max.setMonth(max.getMonth() + 3);
    const y = cursor.getFullYear(); const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7; // semana começa à segunda

    const prevDisabled = new Date(y, m, 1) <= new Date(today.getFullYear(), today.getMonth(), 1);
    const nextDisabled = new Date(y, m + 1, 1) > max;

    let html = `
      <div class="calendar__head">
        <strong>${MONTHS[m]} ${y}</strong>
        <div class="calendar__nav">
          <button type="button" data-cal="-1" ${prevDisabled ? 'disabled' : ''} aria-label="Mês anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button type="button" data-cal="1" ${nextDisabled ? 'disabled' : ''} aria-label="Mês seguinte">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
      <div class="calendar__grid" role="grid">`;
    ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].forEach((d) => { html += `<div class="calendar__dow">${d}</div>`; });
    for (let i = 0; i < offset; i++) html += '<div class="calendar__day is-empty"></div>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const s = iso(date);
      const closed = (OPENING[date.getDay()] || []).length === 0;
      const past = date < today;
      const beyond = date > max;
      const free = !closed && !past && !beyond && dayHasSlots(date);
      const disabled = closed || past || beyond || !free;
      const classes = ['calendar__day'];
      if (date.getTime() === today.getTime()) classes.push('is-today');
      if (state.date === s) classes.push('is-selected');
      html += `<button type="button" class="${classes.join(' ')}" data-date="${s}" ${disabled ? 'disabled' : ''}
        aria-label="${d} de ${MONTHS[m]}${disabled ? ' — sem vagas' : ''}">${d}</button>`;
    }
    html += '</div>';
    calendarEl.innerHTML = html;
  }

  calendarEl.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-cal]');
    if (nav) {
      cursor.setMonth(cursor.getMonth() + Number(nav.dataset.cal));
      renderCalendar();
      return;
    }
    const day = e.target.closest('[data-date]');
    if (!day || day.disabled) return;
    state.date = day.dataset.date;
    state.time = null;
    renderCalendar();
    renderSlots();
    renderSummary();
    updateNav();
  });

  const slotsEl = $('#slots');
  const slotsTitle = $('#slots-title');

  function renderSlots() {
    if (!state.date) {
      slotsEl.innerHTML = '<div class="slots-empty">Escolha primeiro um dia no calendário.</div>';
      slotsTitle.textContent = 'Horários disponíveis';
      return;
    }
    const list = slotsFor(state.date, getService(), state.professional);
    const d = parseISO(state.date);
    slotsTitle.textContent = `Horários · ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}.`;
    if (!list.length) {
      slotsEl.innerHTML = '<div class="slots-empty">Encerrado neste dia. Escolha outra data.</div>';
      return;
    }
    slotsEl.innerHTML = '';
    list.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot' + (state.time === s.time ? ' is-selected' : '');
      b.textContent = s.time;
      b.disabled = !s.available;
      if (!s.available) b.title = 'Horário indisponível';
      b.addEventListener('click', () => {
        state.time = s.time;
        renderSlots();
        renderSummary();
        updateNav();
      });
      slotsEl.appendChild(b);
    });
  }

  /* ---------- Resumo ---------- */
  function renderSummary() {
    const s = getService();
    $('#sum-service').textContent = s ? s.name : '—';
    $('#sum-pro').textContent = getPro().id === 'any' ? 'Sem preferência' : getPro().name;
    $('#sum-date').textContent = state.date ? prettyDate(state.date) : '—';
    $('#sum-time').textContent = state.time ? `${state.time}${s ? ` · ${s.duration} min` : ''}` : '—';
    $('#sum-total').textContent = s ? money(s.price) : '—';
    const review = $('#review-list');
    if (review) {
      review.innerHTML = `
        <div class="summary__row"><dt>Serviço</dt><dd>${s ? s.name : '—'}</dd></div>
        <div class="summary__row"><dt>Profissional</dt><dd>${getPro().id === 'any' ? 'Sem preferência' : getPro().name}</dd></div>
        <div class="summary__row"><dt>Data</dt><dd>${prettyDate(state.date)}</dd></div>
        <div class="summary__row"><dt>Hora</dt><dd>${state.time || '—'}</dd></div>
        <div class="summary__row"><dt>Duração</dt><dd>${s ? s.duration + ' min' : '—'}</dd></div>
        <div class="summary__row"><dt>Nome</dt><dd>${state.data.nome || '—'}</dd></div>
        <div class="summary__row"><dt>Contacto</dt><dd>${state.data.telefone || '—'}${state.data.email ? '<br>' + state.data.email : ''}</dd></div>
        ${state.data.notas ? `<div class="summary__row"><dt>Notas</dt><dd>${state.data.notas}</dd></div>` : ''}`;
    }
  }

  /* ---------- Navegação entre passos ---------- */
  const panels = $$('.wizard-panel');
  const stepperItems = $$('.stepper__item');
  const btnBack = $('#wizard-back');
  const btnNext = $('#wizard-next');

  function canAdvance() {
    if (state.step === 1) return Boolean(state.service);
    if (state.step === 2) return Boolean(state.date && state.time);
    // No passo 3 o botão fica sempre ativo: a validação corre ao clicar e
    // mostra as mensagens de erro campo a campo (um botão inerte não explica nada).
    if (state.step === 3) return true;
    return true;
  }

  function updateNav() {
    btnBack.disabled = state.step === 1;
    btnNext.disabled = !canAdvance();
    btnNext.innerHTML = state.step === 4
      ? 'Confirmar marcação <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
      : 'Continuar <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    stepperItems.forEach((item, i) => {
      item.classList.toggle('is-current', i + 1 === state.step);
      item.classList.toggle('is-done', i + 1 < state.step);
    });
    panels.forEach((p) => p.classList.toggle('is-active', Number(p.dataset.step) === state.step));
  }

  function goTo(step) {
    state.step = Math.min(4, Math.max(1, step));
    if (state.step === 4) renderSummary();
    updateNav();
    const top = root.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  btnBack.addEventListener('click', () => goTo(state.step - 1));
  btnNext.addEventListener('click', () => {
    if (state.step === 3 && !validateDetails(true)) return;
    if (state.step === 4) { submitBooking(); return; }
    goTo(state.step + 1);
  });

  /* ---------- Passo 3: dados pessoais ---------- */
  const detailInputs = $$('#details-form input, #details-form textarea, #details-form select');

  function collect() {
    state.data = {};
    detailInputs.forEach((i) => {
      if (i.type === 'radio') { if (i.checked) state.data[i.name] = i.value; }
      else if (i.type === 'checkbox') state.data[i.name] = i.checked;
      else state.data[i.name] = i.value.trim();
    });
  }

  function validateDetails(showErrors) {
    collect();
    const required = detailInputs.filter((i) => i.required && i.type !== 'radio');
    let ok = true;
    required.forEach((i) => {
      const valid = window.fvValidateField ? window.fvValidateField(i) : Boolean(i.value.trim());
      if (!showErrors) {
        const field = i.closest('.field');
        if (field && !valid) field.classList.remove('field--error');
      }
      if (!valid) ok = false;
    });
    if (showErrors && !ok) {
      const first = $('.field--error input, .field--error textarea');
      if (first) first.focus();
    }
    return ok;
  }

  detailInputs.forEach((i) => {
    i.addEventListener('input', () => { collect(); renderSummary(); updateNav(); });
    i.addEventListener('change', () => { collect(); renderSummary(); updateNav(); });
  });

  /* ---------- Confirmação ---------- */
  const ref = () => 'FV-' + String(Date.now()).slice(-6) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();

  function icsFor(reference) {
    const s = getService();
    const start = new Date(`${state.date}T${state.time}:00`);
    const end = new Date(start.getTime() + s.duration * 60000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fisio Valente//Marcacoes//PT', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${reference}@fisiovalente.pt`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${s.name} — ${CLINIC.name}`,
      `LOCATION:${CLINIC.address}`,
      `DESCRIPTION:Marcação ${reference}. Profissional: ${getPro().id === 'any' ? 'a atribuir' : getPro().name}. Contacto: ${CLINIC.phone}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Consulta na Fisio Valente', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
  }

  function submitBooking() {
    const consent = $('#consent');
    if (consent && !consent.checked) {
      consent.closest('.checkbox').style.color = 'var(--error)';
      consent.focus();
      return;
    }
    btnNext.disabled = true;
    btnNext.textContent = 'A confirmar…';

    // DEMONSTRAÇÃO: nenhuma informação sai do navegador.
    // Em produção: fetch('/api/marcacoes', { method:'POST', body: JSON.stringify(payload) })
    setTimeout(() => {
      const reference = ref();
      const s = getService();
      try {
        const saved = JSON.parse(localStorage.getItem('fv-bookings') || '[]');
        saved.push({ reference, service: s.id, date: state.date, time: state.time, pro: state.professional, data: state.data });
        localStorage.setItem('fv-bookings', JSON.stringify(saved));
      } catch (err) { /* modo privado — segue sem guardar */ }

      $('#wizard').hidden = true;
      $('#booking-aside').hidden = true;
      const done = $('#booking-done');
      done.hidden = false;
      $('#done-ref').textContent = reference;
      $('#done-text').innerHTML =
        `<strong>${s.name}</strong> com ${getPro().id === 'any' ? 'a equipa Fisio Valente' : getPro().name}<br>` +
        `${prettyDate(state.date)} às <strong>${state.time}</strong> · ${s.duration} min`;

      const ics = icsFor(reference);
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const dl = $('#done-ics');
      dl.href = url;
      dl.download = `marcacao-${reference}.ics`;

      const body = encodeURIComponent(
        `Marcação ${reference}\n${s.name}\n${prettyDate(state.date)} às ${state.time}\n` +
        `Nome: ${state.data.nome}\nTelefone: ${state.data.telefone}\nEmail: ${state.data.email}`);
      $('#done-wa').href = `https://wa.me/351289000000?text=${body}`;

      done.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (window.fvToast) window.fvToast('Pedido de marcação registado com sucesso.');
    }, 1000);
  }

  /* ---------- Pré-preenchimento por URL (?servico=…&data=…) ---------- */
  const params = new URLSearchParams(location.search);
  const preService = params.get('servico');
  if (preService && SERVICES.some((s) => s.id === preService)) state.service = preService;
  const preDate = params.get('data');
  if (preDate && /^\d{4}-\d{2}-\d{2}$/.test(preDate)) {
    const d = parseISO(preDate);
    if (d >= new Date(new Date().setHours(0, 0, 0, 0))) { state.date = preDate; cursor = new Date(d.getFullYear(), d.getMonth(), 1); }
  }

  /* ---------- Arranque ---------- */
  renderServices();
  renderProfessionals();
  renderCalendar();
  renderSlots();
  renderSummary();
  updateNav();
  if (state.service) goTo(2);

  // Exposto para a caixa de marcação rápida da página inicial
  window.FVBooking = { services: SERVICES, categories: CATEGORIES };
})();
