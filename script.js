/* =============================================
   RPM University — script.js
   Grading logic: point-based, transparent, fair
   ============================================= */

const materials = {
  math: `<h4>Памятка: Математика</h4>
<p>Предмет охватывает технические основы проекта:</p>
<ol>
  <li>Работа лаунчера RPM — установка и настройка</li>
  <li>Telegram-бот: как связаться через <code>/ac</code>, для чего он и как обратиться</li>
  <li>Способы и правила подачи жалоб на игроков и администрацию</li>
</ol>`,

  physics: `<h4>Памятка: Физика</h4>
<p>Задача — объяснить чаты и голосовое взаимодействие:</p>
<ol>
  <li>IC и OOC чаты: различия, способы написания; МГ и Обратное МГ, отмена</li>
  <li>IC и OOC рации: назначения, способы написания, отмена МГ в рации</li>
  <li>Правила войс-чата, отмена МГ в войс-чате</li>
</ol>`,

  informatics: `<h4>Памятка: Информатика</h4>
<p>Изучаем цифровую безопасность и инструменты:</p>
<ol>
  <li>Установка <code>/2fa</code></li>
  <li>Установка TG Protect</li>
  <li>Синхронизация с Discord</li>
  <li>Использование GPS</li>
  <li>Телефон: вызовы, контакты и прочее</li>
</ol>`,

  history: `<h4>Памятка: История</h4>
<p>Терминология и ориентация на проекте:</p>
<ol>
  <li>Вся терминология, используемая на проекте</li>
  <li>Повторение РП и НонРП чатов</li>
  <li>Изучение проверки терминов на наборах во фракцию</li>
  <li>Демонстрация и объяснение работы с гардеробкой</li>
</ol>`,

  literature: `<h4>Памятка: Литература</h4>
<p>Правила и понятия:</p>
<ol>
  <li>Правила и основные понятия университета</li>
  <li>Основные правила проекта</li>
</ol>`,

  social: `<h4>Памятка: Обществознание</h4>
<p>Начинаем с классификации по Конституции — деление на структуры, иерархия среди них, обозначения фракций.</p>
<p>Затем — рассказ о каждой фракции: Мэрия, СМИ, Больница, Армия, Полиция, ФБР.</p>`,

  pe: `<h4>Памятка: Физкультура</h4>
<p>Ключевой предмет — научить отыгрывать РП и говорить войсом.</p>
<p>Команды для отыгрыша:</p>
<ul>
  <li><code>/me действие</code></li>
  <li><code>/do Состояние</code></li>
  <li><code>/todo Действие : Фраза</code></li>
  <li><code>/try Попытка</code></li>
</ul>`
};

const subjectNames = {
  math: 'Математика', physics: 'Физика', informatics: 'Информатика',
  history: 'История', literature: 'Литература', social: 'Обществознание', pe: 'Физкультура'
};

/* ── Grading system (transparent point-based) ──────────────────
   Main questions Q1-Q3 (required): correct=2, partial=1, incorrect=0  → max 6pts
   Bonus questions BQ1-BQ2 (optional): correct=1, partial=0.5, incorrect=0 → max +2pts

   Final score = main_pts + bonus_pts   (bonus is additive, range 0-2)

   Grade thresholds (out of 6 main + 2 bonus = 8 max):
     A  ≥ 5.5  (e.g. all correct or 2×correct + 1×partial + any bonus)
     B  ≥ 4    (e.g. 2×correct + bonus, or near-perfect main)
     C  ≥ 3    (2×correct, nothing more)
     D  ≥ 2    (1×correct + 1×partial, or 2×partial+...)
     F  < 2    (mostly wrong)
     E  = student left early (auto, overrides all)
────────────────────────────────────────────────────────────── */

const POINT_MAP = { correct: 2, partial: 1, incorrect: 0, none: null };
const BONUS_MAP = { correct: 1, partial: 0.5, incorrect: 0, none: 0 };

function calcScore(ev) {
  const mainVals = [ev.q1, ev.q2, ev.q3];
  if (mainVals.some(v => v === 'none')) return null; // not yet answered
  const mainPts = mainVals.reduce((s, v) => s + POINT_MAP[v], 0);
  const bonusPts = [ev.aq1, ev.aq2].reduce((s, v) => s + BONUS_MAP[v], 0);
  return { main: mainPts, bonus: bonusPts, total: mainPts + bonusPts };
}

function calcGrade(ev) {
  if (ev.left) return 'E';
  const score = calcScore(ev);
  if (score === null) return '-';
  const t = score.total;
  if (t >= 5.5) return 'A';
  if (t >= 4)   return 'B';
  if (t >= 3)   return 'C';
  if (t >= 2)   return 'D';
  return 'F';
}

function gradeColor(g) {
  return { A: '#3ecf8e', B: '#3e96cf', C: '#f5a623', D: '#f0963c', E: '#f06060', F: '#c84040' }[g] || '#555d75';
}

/* ── App state ── */
let state = {
  step: 0,
  subject: null,
  teacher: '',
  studentCount: 0,
  names: [],
  evals: []
};

/* ── DOM refs ── */
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const panels = {
  select:   $('panel-select'),
  names:    $('panel-names'),
  material: $('panel-material'),
  eval:     $('panel-eval'),
  report:   $('panel-report')
};

function showPanel(key) {
  Object.entries(panels).forEach(([k, el]) => {
    el.classList.toggle('hidden', k !== key);
  });
  updateSteps(key);
}

function updateSteps(key) {
  const order = ['select', 'names', 'material', 'eval', 'report'];
  const idx = order.indexOf(key);
  order.forEach((k, i) => {
    const stepEl = $('step-' + k);
    if (!stepEl) return;
    stepEl.classList.remove('active', 'done');
    if (i < idx) stepEl.classList.add('done');
    else if (i === idx) stepEl.classList.add('active');
  });
  $$('.step-line').forEach((line, i) => {
    line.classList.toggle('done', i < idx);
  });
}

/* ── Subject cards ── */
$$('.subject-card').forEach(card => {
  card.addEventListener('click', () => {
    $$('.subject-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.subject = card.dataset.subject;
  });
});

/* ── Step 1: Select → Names ── */
$('btn-next-names').addEventListener('click', () => {
  const teacher = $('input-teacher').value.trim();
  const count = parseInt($('input-count').value);

  if (!state.subject) return alert('Выберите предмет');
  if (!teacher) return alert('Введите ваш никнейм');
  if (!count || count < 1 || count > 50) return alert('Количество студентов: от 1 до 50');

  state.teacher = teacher;
  state.studentCount = count;
  renderNameInputs();
  showPanel('names');
});

function renderNameInputs() {
  const grid = $('names-grid');
  grid.innerHTML = '';
  for (let i = 0; i < state.studentCount; i++) {
    const div = document.createElement('div');
    div.className = 'name-input-item';
    div.innerHTML = `
      <label>Студент ${i + 1}</label>
      <input type="text" class="form-control student-name" placeholder="Никнейм студента ${i + 1}">
    `;
    grid.appendChild(div);
  }
}

/* ── Step 2: Names → Material ── */
$('btn-next-material').addEventListener('click', () => {
  const inputs = $$('.student-name');
  const names = Array.from(inputs).map(i => i.value.trim());
  if (names.some(n => !n)) return alert('Заполните все поля с никнеймами');
  state.names = names;
  $('material-content').innerHTML = materials[state.subject] || '<p>Материал не найден.</p>';
  showPanel('material');
});

/* ── Step 3: Material → Eval ── */
$('btn-next-eval').addEventListener('click', () => {
  renderEvalTable();
  showPanel('eval');
});

function renderEvalTable() {
  const tbody = $('eval-tbody');
  tbody.innerHTML = '';
  state.evals = state.names.map(name => ({
    name, q1: 'none', q2: 'none', q3: 'none',
    aq1: 'none', aq2: 'none', left: false, grade: '-'
  }));

  state.names.forEach((name, i) => {
    const tr = document.createElement('tr');
    tr.dataset.student = i;
    tr.innerHTML = `
      <td class="student-name-cell">${escHtml(name)}</td>
      ${makeEvalCell(i, 'q1', false)}
      ${makeEvalCell(i, 'q2', false)}
      ${makeEvalCell(i, 'q3', false)}
      ${makeEvalCell(i, 'aq1', true)}
      ${makeEvalCell(i, 'aq2', true)}
      <td style="text-align:center">
        <input type="checkbox" class="left-early-cb" data-student="${i}">
      </td>
      <td id="grade-cell-${i}">
        <span class="grade-pill grade-none">—</span>
      </td>
      <td id="score-cell-${i}">
        <div class="score-bar-wrap">
          <div class="score-bar"><div class="score-bar-fill" style="width:0%;background:#555d75"></div></div>
          <span class="score-val">—</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach events
  $$('.eval-select').forEach(sel => sel.addEventListener('change', onEvalChange));
  $$('.left-early-cb').forEach(cb => cb.addEventListener('change', onEvalChange));
}

function makeEvalCell(i, key, optional) {
  const placeholder = optional ? '— (доп.)' : '—';
  return `<td>
    <select class="eval-select" data-student="${i}" data-key="${key}">
      <option value="none">${placeholder}</option>
      <option value="correct">✓ Правильно</option>
      <option value="partial">≈ 50/50</option>
      <option value="incorrect">✗ Неправильно</option>
    </select>
  </td>`;
}

function onEvalChange(e) {
  const el = e.target;
  const i = parseInt(el.dataset.student);
  const ev = state.evals[i];

  if (el.classList.contains('left-early-cb')) {
    ev.left = el.checked;
  } else {
    const key = el.dataset.key;
    ev[key] = el.value;
    // Update select styling
    el.className = 'eval-select';
    if (el.value !== 'none') el.classList.add('val-' + el.value);
  }

  ev.grade = calcGrade(ev);
  updateStudentDisplay(i);
}

function updateStudentDisplay(i) {
  const ev = state.evals[i];
  const grade = ev.grade;

  // Grade pill
  const gradeCell = $('grade-cell-' + i);
  const cls = grade === '-' ? 'grade-none' : 'grade-' + grade;
  gradeCell.innerHTML = `<span class="grade-pill ${cls}">${grade === '-' ? '—' : grade}</span>`;

  // Score bar
  const scoreCell = $('score-cell-' + i);
  const score = calcScore(ev);
  if (ev.left) {
    scoreCell.innerHTML = `<div class="score-bar-wrap"><span class="score-val" style="color:var(--danger)">Ушёл</span></div>`;
    return;
  }
  if (!score) {
    scoreCell.innerHTML = `<div class="score-bar-wrap"><div class="score-bar"><div class="score-bar-fill" style="width:0%;background:var(--text3)"></div></div><span class="score-val">—</span></div>`;
    return;
  }
  const pct = Math.round((score.total / 8) * 100);
  const color = gradeColor(grade);
  scoreCell.innerHTML = `
    <div class="score-bar-wrap">
      <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="score-val" style="color:${color}">${score.total.toFixed(1)}</span>
    </div>
  `;
}

/* ── Step 4: Generate report ── */
$('btn-generate-report').addEventListener('click', () => {
  const pending = state.evals.filter(ev => !ev.left && ev.grade === '-');
  if (pending.length > 0) {
    if (!confirm(`${pending.length} студент(ов) не имеют оценок (не все вопросы заполнены). Продолжить?`)) return;
  }
  generateReport();
  showPanel('report');
});

function generateReport() {
  let lines = [];
  lines.push('```');
  lines.push(`Преподаватель: ${state.teacher}`);
  lines.push(`Предмет: ${subjectNames[state.subject]}`);
  lines.push('');
  state.evals.forEach(ev => {
    if (ev.grade !== '-') {
      lines.push(`${ev.name} — ${ev.grade}`);
    }
  });
  const graded = state.evals.filter(ev => ev.grade !== '-').length;
  lines.push('');
  lines.push(`Оценок выставлено: ${graded}`);
  lines.push('```');
  $('report-content').textContent = lines.join('\n');
}

$('btn-copy-report').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('report-content').textContent);
  const btn = $('btn-copy-report');
  btn.textContent = '✓ Скопировано!';
  setTimeout(() => btn.textContent = 'Копировать', 2000);
});

function resetToStart() {
  state = { step: 0, subject: null, teacher: '', studentCount: 0, names: [], evals: [] };
  $$('.subject-card').forEach(c => c.classList.remove('selected'));
  $('input-teacher').value = '';
  $('input-count').value = '8';
  showPanel('select');
}

$('btn-reset-1').addEventListener('click', resetToStart);
$('btn-reset-2').addEventListener('click', resetToStart);

/* ══════════════════════════════════════════
   DAILY REPORT
══════════════════════════════════════════ */

// Set today's date
const today = new Date();
$('report-date').value = today.toISOString().split('T')[0];

function addClassLink() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <select class="form-control class-subject" style="flex:0 0 150px">
      ${Object.entries(subjectNames).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
    </select>
    <input type="text" class="form-control" placeholder="Ссылка на пару">
    <button type="button" class="remove-btn" onclick="this.closest('.dynamic-row').remove()">✕</button>
  `;
  $('class-links').appendChild(row);
}

function addStudent() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <input type="text" class="form-control" placeholder="Никнейм студента">
    <button type="button" class="remove-btn" onclick="this.closest('.dynamic-row').remove()">✕</button>
  `;
  $('accepted-students').appendChild(row);
}

function addEvent() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <input type="text" class="form-control" placeholder="Название мероприятия">
    <div class="time-pair">
      <input type="text" class="form-control" placeholder="ЧЧ:ММ">
      <span>—</span>
      <input type="text" class="form-control" placeholder="ЧЧ:ММ">
    </div>
    <button type="button" class="remove-btn" onclick="this.closest('.dynamic-row').remove()">✕</button>
  `;
  $('events-list').appendChild(row);
}

$('btn-add-class').addEventListener('click', addClassLink);
$('btn-add-student').addEventListener('click', addStudent);
$('btn-add-event').addEventListener('click', addEvent);

$('btn-generate-daily').addEventListener('click', () => {
  const dateVal = $('report-date').value;
  if (!dateVal) return alert('Укажите дату');
  const [y, m, d] = dateVal.split('-');
  const dateFmt = `${d}.${m}.${y}`;

  const classRows = $$('#class-links .dynamic-row');
  const classes = Array.from(classRows).map(row => {
    const sel = row.querySelector('.class-subject');
    const inp = row.querySelector('input');
    return { subject: sel ? sel.value : '', link: inp ? inp.value.trim() : '' };
  }).filter(c => c.link);

  const gradesCount = parseInt($('grades-count').value) || 0;

  const studentNames = Array.from($$('#accepted-students input'))
    .map(i => i.value.trim()).filter(Boolean);

  const eventRows = $$('#events-list .dynamic-row');
  const events = Array.from(eventRows).map(row => {
    const inputs = row.querySelectorAll('input');
    return {
      name: inputs[0] ? inputs[0].value.trim() : '',
      start: inputs[1] ? inputs[1].value.trim() : '',
      end: inputs[2] ? inputs[2].value.trim() : ''
    };
  }).filter(e => e.name);

  let r = '';
  r += `\`Отчётность о работе за\` ***\`${dateFmt}\`***\n`;
  r += '```Основная работа за день:```\n';
  r += `\`Количество проведённых пар: ${classes.length}\`\n`;
  classes.forEach((c, i) => {
    r += `> ${i + 1}. ${subjectNames[c.subject]}: ${c.link}\n`;
  });
  r += `\`Количество выставленных оценок: ${gradesCount}\`\n`;
  r += `\`Количество принятых студентов: ${studentNames.length}\`\n`;
  if (studentNames.length) r += studentNames.join(' ') + '\n';
  if (events.length) {
    r += `\`Количество проведённых мероприятий: ${events.length}\`\n`;
    events.forEach(ev => {
      r += ev.start && ev.end ? `${ev.name}: ${ev.start} — ${ev.end}\n` : `${ev.name}\n`;
    });
  } else {
    r += `\`Количество проведённых мероприятий: -\`\n`;
  }

  $('daily-report-content').textContent = r;
  $('daily-report-result').classList.remove('hidden');
  $('daily-report-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('btn-copy-daily').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('daily-report-content').textContent);
  const btn = $('btn-copy-daily');
  btn.textContent = '✓ Скопировано!';
  setTimeout(() => btn.textContent = 'Копировать', 2000);
});

$('btn-reset-daily').addEventListener('click', () => {
  $('daily-report-result').classList.add('hidden');
  window.scrollTo({ top: $('section-daily').offsetTop - 80, behavior: 'smooth' });
});

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
