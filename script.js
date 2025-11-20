/* Awesome Todo — features:
   - Add / Edit / Delete / Complete
   - localStorage persistence
   - Search & Filter (all / active / completed / overdue)
   - Due-date visual states: overdue, due soon (<=2 days)
   - Edit modal for safe edits
   - Keyboard-friendly: Enter to add, Esc to cancel modal
*/

const KEY = 'awesome_todos_v1';

// DOM
const todoInput = document.getElementById('todo-input');
const todoDate = document.getElementById('todo-date');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const stats = document.getElementById('stats');

const searchInput = document.getElementById('search-input');
const filterSelect = document.getElementById('filter');

const clearCompletedBtn = document.getElementById('clear-completed');
const clearAllBtn = document.getElementById('clear-all');

// edit modal
const editModal = document.getElementById('edit-modal');
const editTitle = document.getElementById('edit-title');
const editDate = document.getElementById('edit-date');
const saveEditBtn = document.getElementById('save-edit');
const cancelEditBtn = document.getElementById('cancel-edit');

let todos = [];
let editId = null;

// Init
load();
bindEvents();
render();

function bindEvents(){
  addBtn.addEventListener('click', handleAdd);
  todoInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') handleAdd(); });
  searchInput.addEventListener('input', render);
  filterSelect.addEventListener('change', render);
  clearCompletedBtn.addEventListener('click', clearCompleted);
  clearAllBtn.addEventListener('click', clearAll);

  // Modal events
  saveEditBtn.addEventListener('click', saveEdit);
  cancelEditBtn.addEventListener('click', closeModal);
  editModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // accessibility: close modal on backdrop click
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
  });
}

function handleAdd(){
  const title = todoInput.value.trim();
  const date = todoDate.value || null;
  if (!title) {
    todoInput.focus();
    return;
  }

  const newTodo = {
    id: cryptoRandomId(),
    title,
    date,
    completed: false,
    createdAt: Date.now()
  };

  todos.unshift(newTodo);
  save();
  render();

  // quick micro animation / reset
  todoInput.value = '';
  todoDate.value = '';
  todoInput.focus();
}

function render(){
  const q = (searchInput.value || '').toLowerCase();
  const filter = filterSelect.value;

  // clear
  todoList.innerHTML = '';

  // apply search & filter
  const list = todos.filter(t => {
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (filter === 'active' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;
    if (filter === 'overdue') {
      return isOverdue(t);
    }
    return true;
  });

  if (list.length === 0) {
    stats.textContent = todos.length ? 'No matching todos — try different filters or search.' : 'No todos yet — add something awesome ✨';
  } else {
    stats.textContent = `${list.length} of ${todos.length} todo(s)`;
  }

  // sort by createdAt (newest first), but could extend to sort by date
  list.forEach(todo => {
    const card = createCard(todo);
    todoList.appendChild(card);
  });
}

function createCard(todo){
  const card = document.createElement('article');
  card.className = 'todo';
  if (todo.completed) card.classList.add('completed');
  if (isOverdue(todo)) card.classList.add('overdue');
  else if (isDueSoon(todo)) card.classList.add('due-soon');

  // left
  const left = document.createElement('div');
  left.className = 'todo-left';

  const checkbox = document.createElement('button');
  checkbox.className = 'checkbox';
  checkbox.title = todo.completed ? 'Mark as active' : 'Mark as completed';
  checkbox.innerHTML = todo.completed ? checkedSVG() : circleSVG();
  checkbox.addEventListener('click', () => toggleComplete(todo.id));

  const meta = document.createElement('div');
  meta.className = 'todo-meta';

  const title = document.createElement('div');
  title.className = 'todo-title';
  title.textContent = todo.title;

  const sub = document.createElement('div');
  sub.className = 'todo-sub';
  sub.textContent = todo.date ? formatDate(todo.date) : 'No due date';

  meta.appendChild(title);
  meta.appendChild(sub);
  left.appendChild(checkbox);
  left.appendChild(meta);

  // actions
  const actions = document.createElement('div');
  actions.className = 'todo-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn';
  editBtn.title = 'Edit';
  editBtn.innerHTML = editSVG();
  editBtn.addEventListener('click', () => openEditModal(todo.id));

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn';
  delBtn.title = 'Delete';
  delBtn.innerHTML = trashSVG();
  delBtn.addEventListener('click', () => {
    if (confirm('Delete this todo?')) {
      removeTodo(todo.id);
    }
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  card.appendChild(left);
  card.appendChild(actions);

  return card;
}

/* ---------- CRUD operations ---------- */
function toggleComplete(id){
  const t = todos.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  save();
  render();
}

function removeTodo(id){
  todos = todos.filter(t => t.id !== id);
  save();
  render();
}

function clearCompleted(){
  if (!todos.some(t => t.completed)) return alert('No completed todos to clear.');
  if (!confirm('Clear all completed todos?')) return;
  todos = todos.filter(t => !t.completed);
  save();
  render();
}

function clearAll(){
  if (!todos.length) return;
  if (!confirm('Clear ALL todos? This cannot be undone.')) return;
  todos = [];
  save();
  render();
}

/* ---------- Edit modal ---------- */
function openEditModal(id){
  const t = todos.find(x => x.id === id);
  if (!t) return;
  editId = id;
  editTitle.value = t.title;
  editDate.value = t.date || '';
  editModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => editTitle.focus(), 80);
}

function closeModal(){
  editModal.setAttribute('aria-hidden', 'true');
  editId = null;
}

function saveEdit(){
  if (!editId) return;
  const t = todos.find(x => x.id === editId);
  if (!t) return;
  const newTitle = editTitle.value.trim();
  if (!newTitle) return alert('Title cannot be empty.');
  t.title = newTitle;
  t.date = editDate.value || null;
  save();
  closeModal();
  render();
}

/* ---------- persistence ---------- */
function save(){
  try {
    localStorage.setItem(KEY, JSON.stringify(todos));
  } catch (e) {
    console.error('Failed saving todos', e);
  }
}

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    todos = raw ? JSON.parse(raw) : [];
  } catch (e) {
    todos = [];
  }
}

/* ---------- helpers ---------- */
function formatDate(iso){
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(todo){
  if (!todo.date || todo.completed) return false;
  const today = new Date();
  const due = new Date(todo.date + 'T23:59:59');
  return due < startOfDay(today);
}

function isDueSoon(todo){
  if (!todo.date || todo.completed) return false;
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(todo.date + 'T00:00:00'));
  const diff = (due - today) / (1000 * 60 * 60 * 24); // days
  return diff >= 0 && diff <= 2; // due today or within 2 days
}

function startOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0); }

function cryptoRandomId(){
  // friendly unique id
  return 't_' + Math.random().toString(36).slice(2,9);
}

/* ---------- small SVG icons (inline for crispness) ---------- */
function circleSVG(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>`; }
function checkedSVG(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`; }
function editSVG(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21v-3.75L17.81 2.44a2.75 2.75 0 0 1 3.9 0l.85.85a2.75 2.75 0 0 1 0 3.9L7.6 22.99 3 21z"/></svg>`; }
function trashSVG(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`; }

/* ---------- seed demo (optional) ---------- */
// If there are no todos, seed a couple for the first time
if (!todos.length) {
  const seed = [
    { id: cryptoRandomId(), title: 'Add a short task', date: null, completed:false, createdAt: Date.now() - 1000 },
    { id: cryptoRandomId(), title: 'Finish hackathon submission', date: addDaysISO(1), completed:false, createdAt: Date.now() - 2000 },
    { id: cryptoRandomId(), title: 'Prepare slide deck', date: addDaysISO(-1), completed:false, createdAt: Date.now() - 3000 }
  ];
  // only seed if localStorage empty
  if (!localStorage.getItem(KEY)) {
    todos = seed;
    save();
  }
}
render();

function addDaysISO(days){
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
