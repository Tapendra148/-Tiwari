const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let cats = load('cats', [
  {id:'work', name:'Work', color:'#2b6cb0'},
  {id:'personal', name:'Personal', color:'#c05621'},
  {id:'study', name:'Study', color:'#2f855a'},
  {id:'shopping', name:'Shopping', color:'#b83280'}
]);
let tasks = load('tasks', []);
let view = {cat:'all', status:'all', q:'', sort:'created'};
let editing = null;
const PRI = {1:'Low', 2:'Medium', 3:'High'};
const today = () => new Date().toISOString().slice(0, 10);
const catOf = id => cats.find(c => c.id === id);
const persist = () => { save('cats', cats); save('tasks', tasks); };

function renderCats() {
  const count = id => tasks.filter(t => !t.done && (id === 'all' || t.cat === id)).length;
  const row = (id, name, color, removable) => `
    <div class="cat-row">
      <button class="cat ${view.cat === id ? 'on' : ''}" data-cat="${id}" style="--c:${color}">
        <span class="dot"></span><span class="name">${esc(name)}</span><span class="n">${count(id)}</span>
      </button>
      ${removable ? `<button class="x" data-del-cat="${id}" aria-label="Delete category ${esc(name)}">✕</button>` : ''}
    </div>`;
  $('#cats').innerHTML = row('all', 'All tasks', 'var(--ink)', false)
    + cats.map(c => row(c.id, c.name, c.color, true)).join('')
    + row('', 'Uncategorized', 'var(--mute)', false);
  $('#cat').innerHTML = cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')
    + '<option value="">Uncategorized</option>';
  if (view.cat !== 'all' && view.cat !== '' && !catOf(view.cat)) view.cat = 'all';
}

function visible() {
  let r = tasks.filter(t =>
    (view.cat === 'all' || t.cat === view.cat) &&
    (view.status === 'all' || (view.status === 'done') === t.done) &&
    t.title.toLowerCase().includes(view.q.toLowerCase()));
  const s = {
    created: (a, b) => b.created - a.created,
    due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'),
    pri: (a, b) => b.pri - a.pri,
    az: (a, b) => a.title.localeCompare(b.title)
  }[view.sort];
  return r.sort(s);
}

function renderTasks() {
  const list = visible();
  $('#list').innerHTML = list.length ? list.map(t => {
    const c = catOf(t.cat), over = t.due && !t.done && t.due < today();
    return `<li class="task ${t.done ? 'done' : ''}" style="--c:${c ? c.color : 'var(--mute)'}">
      <input type="checkbox" data-act="toggle" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Mark complete">
      <div class="body">
        ${editing === t.id
          ? `<input class="edit" type="text" id="editInput" value="${esc(t.title)}" maxlength="120" data-id="${t.id}" aria-label="Edit task">`
          : `<div class="title">${esc(t.title)}</div>`}
        <div class="meta">
          <span>${c ? esc(c.name) : 'Uncategorized'}</span>
          <span class="pri ${t.pri === 3 ? 'high' : ''}">${PRI[t.pri]} priority</span>
          ${t.due ? `<span class="${over ? 'over' : ''}">${over ? 'Overdue: ' : 'Due '}${t.due}</span>` : ''}
        </div>
      </div>
      <div class="actions">
        <button data-act="edit" data-id="${t.id}">${editing === t.id ? 'Save' : 'Edit'}</button>
        <button class="del" data-act="del" data-id="${t.id}" aria-label="Delete task">Delete</button>
      </div>
    </li>`;
  }).join('') : `<li class="empty">${tasks.length ? 'No tasks match these filters.' : 'No tasks yet. Add your first task above.'}</li>`;

  const done = tasks.filter(t => t.done).length;
  $('#progText').textContent = `${done} of ${tasks.length} done`;
  $('#progBar').style.width = tasks.length ? (done / tasks.length * 100) + '%' : '0';
  $('#count').textContent = `${tasks.length - done} left`;
  if (editing) {
    const i = $('#editInput');
    if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }
}

const render = () => { renderCats(); renderTasks(); persist(); };

// Add task
$('#addForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = $('#title').value.trim();
  if (!title) return;
  tasks.push({
    id: uid(), title, cat: $('#cat').value, pri: +$('#pri').value,
    due: $('#due').value, done: false, created: Date.now()
  });
  $('#title').value = ''; $('#due').value = '';
  render();
});

// Add category
$('#catForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#catName').value.trim();
  if (!name || cats.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
  cats.push({id: uid(), name, color: $('#catColor').value});
  $('#catName').value = '';
  render();
});

// Category clicks: filter or delete
$('#cats').addEventListener('click', e => {
  const del = e.target.closest('[data-del-cat]');
  if (del) {
    const c = catOf(del.dataset.delCat);
    if (confirm(`Delete "${c.name}"? Its tasks will move to Uncategorized.`)) {
      tasks.forEach(t => { if (t.cat === c.id) t.cat = ''; });
      cats = cats.filter(x => x.id !== c.id);
      render();
    }
    return;
  }
  const b = e.target.closest('[data-cat]');
  if (b) { view.cat = b.dataset.cat; render(); }
});

// Task actions
function commitEdit() {
  const i = $('#editInput');
  if (i && i.value.trim()) tasks.find(t => t.id === i.dataset.id).title = i.value.trim();
  editing = null;
}
$('#list').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id, t = tasks.find(x => x.id === id);
  if (b.dataset.act === 'toggle') t.done = b.checked;
  if (b.dataset.act === 'del') tasks = tasks.filter(x => x.id !== id);
  if (b.dataset.act === 'edit') { editing === id ? commitEdit() : (editing = id); }
  render();
});
$('#list').addEventListener('keydown', e => {
  if (e.target.id !== 'editInput') return;
  if (e.key === 'Enter') { commitEdit(); render(); }
  if (e.key === 'Escape') { editing = null; render(); }
});

// Search, sort, status filter
$('#search').addEventListener('input', e => { view.q = e.target.value; renderTasks(); });
$('#sort').addEventListener('change', e => { view.sort = e.target.value; renderTasks(); });
$('#status').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  view.status = b.dataset.s;
  document.querySelectorAll('#status button').forEach(x => x.classList.toggle('on', x === b));
  renderTasks();
});
$('#clear').addEventListener('click', () => {
  if (tasks.some(t => t.done) && confirm('Remove all completed tasks?')) {
    tasks = tasks.filter(t => !t.done);
    render();
  }
});

// Dark mode
const setTheme = t => {
  document.documentElement.dataset.theme = t;
  $('#theme').textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
  save('theme', t);
};
setTheme(load('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#theme').addEventListener('click', () =>
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

render();