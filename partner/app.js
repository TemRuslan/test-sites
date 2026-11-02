/* Партнёр: меню, калькулятор, лента направлений, фильтр проектов, заявка */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var KEY = 'partner.raschet';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // направления: людей на 1000 м², минимум и максимум людей, месяцы от площади
  var WORKS = [
    { id: 'karkas',    name: 'Каркас и генподряд',     crew: 'Монолитчики и арматурщики', p: 1.1, min: 16, max: 150, m: function (a) { return 3 + a / 9000; } },
    { id: 'vnutri',    name: 'Внутренние работы',      crew: 'Отделочники',               p: 0.8, min: 10, max: 110, m: function (a) { return 2 + a / 14000; } },
    { id: 'obolochka', name: 'Оболочка здания',        crew: 'Фасадчики и кровельщики',   p: 0.5, min: 10, max: 80,  m: function (a) { return 2 + a / 16000; } },
    { id: 'seti',      name: 'Сети под землёй',        crew: 'Сетевики и машинисты',      p: 0.2, min: 8,  max: 36,  m: function (a) { return 1.5 + a / 35000; } },
    { id: 'dvor',      name: 'Двор и территория',      crew: 'Дорожники и озеленители',   p: 0.25, min: 8, max: 40,  m: function (a) { return 1.5 + a / 40000; } },
    { id: 'snab',      name: 'Снабжение материалами',  crew: 'Снабженцы и водители',      p: 0.04, min: 3, max: 9,   m: function () { return 0; } },
    { id: 'proekt',    name: 'Проект и подготовка',    crew: 'Проектировщики и сметчики', p: 0.03, min: 4, max: 10,  m: function (a) { return 1 + a / 60000; } }
  ];
  var TYPES = { res: { k: 1, name: 'Жилой дом' }, com: { k: 0.9, name: 'Офис или торговля' }, ind: { k: 0.7, name: 'Склад или цех' } };
  var byId = {};
  WORKS.forEach(function (w) { byId[w.id] = w; });

  var nf = new Intl.NumberFormat('ru-RU');
  function n(x) { return nf.format(x).replace(/\s/g, ' '); }
  function plural(x, a, b, c) { x = Math.abs(x) % 100; var y = x % 10; if (x > 10 && x < 20) return c; if (y > 1 && y < 5) return b; if (y === 1) return a; return c; }

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var q = new URLSearchParams(location.search);
    if (q.get('works')) {
      s = { works: q.get('works').split(',').filter(function (id) { return byId[id]; }), type: q.get('type') || 'res', area: +q.get('area') || 12000 };
    }
    if (!s || !Array.isArray(s.works)) s = { works: ['karkas', 'obolochka'], type: 'res', area: 12000, fresh: true };
    if (!TYPES[s.type]) s.type = 'res';
    s.area = Math.min(150000, Math.max(1000, +s.area || 12000));
    return s;
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify({ works: s.works, type: s.type, area: s.area, sent: !!s.sent })); } catch (e) {}
  }

  function calc(s) {
    var a = s.area, k = TYPES[s.type].k, rows = [], people = 0, months = [], prep = 0, build = 0;
    WORKS.forEach(function (w) {
      if (s.works.indexOf(w.id) < 0) return;
      var ppl = Math.round(Math.min(w.max, Math.max(w.min, w.min + a / 1000 * w.p)));
      people += ppl; rows.push([w.crew, ppl]);
      var m = w.m(a) * k;
      if (w.id === 'proekt') prep = m; else if (m > 0) months.push(m);
    });
    if (months.length) {
      var mx = Math.max.apply(null, months), sum = months.reduce(function (t, x) { return t + x; }, 0);
      build = Math.max(mx, sum * 0.6);
    }
    var total = prep + build; if (!total && s.works.length) total = 0.5;
    var onlyPaper = s.works.every(function (id) { return id === 'proekt' || id === 'snab'; });
    return {
      rows: rows,
      lo: Math.max(1, Math.round(total)),
      hi: Math.max(2, Math.round(total * 1.25 + 0.4)),
      peak: Math.max(4, Math.round(people * 0.8)),
      start: onlyPaper ? '10 дней' : '2 недели'
    };
  }

  /* меню */
  var burger = document.querySelector('.burger'), mnav = document.getElementById('mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var o = mnav.dataset.open !== 'true';
      mnav.dataset.open = o; burger.setAttribute('aria-expanded', o);
      burger.setAttribute('aria-label', o ? 'Закрыть меню' : 'Открыть меню');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mnav.dataset.open === 'true') { burger.click(); burger.focus(); }
    });
  }

  /* калькулятор на главной */
  var calcEl = document.getElementById('raschet');
  if (calcEl) {
    var st = load();
    var worksBox = calcEl.querySelector('.works'), range = calcEl.querySelector('#area-range'), num = calcEl.querySelector('#area-num');
    var res = calcEl.querySelector('.result-body'), sendBtn = calcEl.querySelector('#send-calc');
    WORKS.forEach(function (w) {
      var l = document.createElement('label'); l.className = 'work';
      l.innerHTML = '<input type="checkbox" value="' + w.id + '"><span>' + w.name + '</span>';
      worksBox.appendChild(l);
    });
    function sync() {
      worksBox.querySelectorAll('input').forEach(function (i) { i.checked = st.works.indexOf(i.value) >= 0; });
      var t = calcEl.querySelector('input[name="type"][value="' + st.type + '"]'); if (t) t.checked = true;
      range.value = st.area; num.value = st.area;
    }
    function render() {
      if (!st.works.length) {
        res.innerHTML = '<p class="res-empty">Отметьте хотя бы одну работу, и здесь появится срок и состав бригад.</p>';
        sendBtn.disabled = true; return;
      }
      sendBtn.disabled = false;
      var r = calc(st), max = Math.max.apply(null, r.rows.map(function (x) { return x[1]; }));
      res.innerHTML =
        '<div class="res-top">' +
        '<div><b>' + r.lo + '-' + r.hi + ' мес</b><span>срок по выбранным работам</span></div>' +
        '<div><b>' + r.peak + ' чел</b><span>на площадке в самый загруженный месяц</span></div>' +
        '<div><b>' + r.start + '</b><span>от аванса до выхода бригад</span></div>' +
        '</div><ul class="bars" aria-label="Состав бригад">' +
        r.rows.map(function (x) {
          return '<li><span>' + x[0] + '</span><i style="transform:scaleX(' + (x[1] / max).toFixed(3) + ')"></i><em>' + x[1] + ' чел</em></li>';
        }).join('') + '</ul>';
    }
    function update() { save(st); render(); }
    worksBox.addEventListener('change', function (e) {
      var v = e.target.value, i = st.works.indexOf(v);
      if (e.target.checked && i < 0) st.works.push(v);
      if (!e.target.checked && i >= 0) st.works.splice(i, 1);
      update();
    });
    calcEl.querySelector('.seg').addEventListener('change', function (e) { st.type = e.target.value; update(); });
    range.addEventListener('input', function () { st.area = +range.value; num.value = st.area; update(); });
    num.addEventListener('change', function () {
      var v = Math.round(+num.value || 0);
      st.area = Math.min(150000, Math.max(1000, v)); num.value = st.area; range.value = st.area; update();
    });
    sendBtn.addEventListener('click', function () {
      st.sent = true; save(st);
      location.href = 'kontakty.html?works=' + st.works.join(',') + '&type=' + st.type + '&area=' + st.area + '#zayavka';
    });
    sync(); render();
  }

  /* лента направлений */
  var ribbon = document.querySelector('.ribbon');
  if (ribbon) {
    var tabs = Array.prototype.slice.call(ribbon.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    function show(i, focus, fromHash) {
      tabs.forEach(function (t, j) {
        var on = j === i;
        t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      var p = panels[i];
      if (!reduce) { p.classList.add('enter'); requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.remove('enter'); }); }); }
      tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      if (focus) tabs[i].focus();
      if (!fromHash) history.replaceState(null, '', '#' + p.dataset.id);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i, false); });
      t.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); show(j, true); }
      });
    });
    function fromHash() {
      var id = location.hash.slice(1), i = panels.findIndex(function (p) { return p.dataset.id === id; });
      show(i < 0 ? 0 : i, false, true);
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
    var cur = function () { return tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }); };
    document.querySelector('.pager .prev').addEventListener('click', function () { show((cur() - 1 + tabs.length) % tabs.length, false); ribbon.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); });
    document.querySelector('.pager .next').addEventListener('click', function () { show((cur() + 1) % tabs.length, false); ribbon.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); });

    var stD = load();
    if (stD.fresh) stD.works = [];
    function paintAdd() {
      document.querySelectorAll('.add-work').forEach(function (b) {
        var on = stD.works.indexOf(b.dataset.work) >= 0;
        b.setAttribute('aria-pressed', on);
        b.textContent = on ? 'Убрать из расчёта' : 'Добавить в расчёт';
        var note = b.parentNode.querySelector('.added');
        note.innerHTML = on ? 'В расчёте. <a class="link" href="index.html#raschet">Открыть калькулятор</a>' : '';
      });
    }
    document.querySelectorAll('.add-work').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.work, i = stD.works.indexOf(v);
        if (i >= 0) stD.works.splice(i, 1); else stD.works.push(v);
        stD.fresh = false; save(stD); paintAdd();
      });
    });
    paintAdd();
  }

  /* фильтр проектов */
  var filter = document.querySelector('.filter');
  if (filter) {
    var rows = document.querySelectorAll('.ledger .row'), note = document.querySelector('.filter-count');
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      filter.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      var f = b.dataset.f, shown = 0;
      rows.forEach(function (r) { var on = f === 'all' || r.dataset.cat === f; r.hidden = !on; if (on) shown++; });
      note.textContent = 'Показано ' + shown + ' ' + plural(shown, 'объект', 'объекта', 'объектов');
    });
  }

  /* заявка */
  var form = document.getElementById('zayavka-form');
  if (form) {
    var stF = load(), setBox = document.getElementById('set-box'), setField = form.querySelector('[name="raschet"]');
    var hasCalc = new URLSearchParams(location.search).get('works') || stF.sent;
    function paintSet() {
      if (!hasCalc || !stF.works.length) { setBox.hidden = true; setField.value = ''; return; }
      var r = calc(stF), names = stF.works.map(function (id) { return byId[id].name; });
      var line = names.join(', ') + '. ' + TYPES[stF.type].name + ', ' + n(stF.area) + ' м². Ориентир ' + r.lo + '-' + r.hi + ' мес, до ' + r.peak + ' человек.';
      setBox.hidden = false;
      setBox.querySelector('p').textContent = line;
      setField.value = line;
    }
    setBox.querySelector('button').addEventListener('click', function () {
      hasCalc = false; stF.sent = false; save(stF); paintSet();
      history.replaceState(null, '', location.pathname + '#zayavka');
    });
    paintSet();

    var MAXF = 10 * 1024 * 1024;
    var fileIn = form.querySelector('#f-file'), fileName = form.querySelector('#f-file-name');
    var fileDefault = fileName.textContent;
    fileIn.addEventListener('change', function () {
      var f = fileIn.files[0];
      fileName.textContent = !f ? fileDefault : (f.size > MAXF ? 'Файл больше 10 МБ, отправьте его письмом' : f.name);
    });

    var msg = document.getElementById('f-status'), btn = form.querySelector('[type="submit"]');
    var checks = {
      name: function (v) { return v.trim() ? '' : 'Напишите, как к вам обращаться.'; },
      phone: function (v) { var d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 12 ? '' : 'Нужен телефон для обратного звонка: 10 цифр после +7.'; },
      email: function (v) { v = v.trim(); return !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? '' : 'В адресе почты ошибка, проверьте символ @ и домен.'; }
    };
    function check(name) {
      var el = form.elements[name], err = checks[name](el.value), box = document.getElementById('e-' + name);
      el.setAttribute('aria-invalid', err ? 'true' : 'false'); box.textContent = err; return !err;
    }
    Object.keys(checks).forEach(function (k) {
      form.elements[k].addEventListener('blur', function () { if (form.elements[k].value) check(k); });
      form.elements[k].addEventListener('input', function () { if (form.elements[k].getAttribute('aria-invalid') === 'true') check(k); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = 'status-msg'; msg.textContent = '';
      var ok = ['name', 'phone', 'email'].map(check).every(Boolean);
      if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }
      if (!form.elements.agree.checked) {
        msg.className = 'status-msg bad'; msg.textContent = 'Поставьте галочку под формой, без неё мы не можем использовать ваш телефон.'; form.elements.agree.focus(); return;
      }
      if (fileIn.files[0] && fileIn.files[0].size > MAXF) {
        msg.className = 'status-msg bad'; msg.textContent = 'Файл больше 10 МБ. Уберите его и отправьте письмом на info@partner-gp.ru.'; return;
      }
      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Отправляем';
      fetch('zayavka.php', { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'сервер ответил не так, как ожидалось' }; }); })
        .then(function (d) {
          if (!d.ok) throw new Error(d.error || '');
          form.reset(); fileName.textContent = fileDefault;
          hasCalc = false; stF.sent = false; save(stF); paintSet();
          msg.className = 'status-msg ok'; msg.textContent = 'Заявка у нас. Руководитель проекта позвонит в течение двух рабочих часов.';
        })
        .catch(function (err) {
          msg.className = 'status-msg bad';
          msg.textContent = 'Заявка не отправилась' + (err.message ? ': ' + err.message : '') + '. Позвоните +7 (499) 390-62-14 или напишите на info@partner-gp.ru.';
        })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });
  }
})();

/* тень шапки при прокрутке */
(function () {
  var top = document.querySelector('.top');
  if (!top) return;
  function onScroll() { top.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
