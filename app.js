// app.js — Supabase-powered frontend (ES Module)
// IMPORTANT: replace the placeholders with your Supabase project values below.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://YOUR_SUPABASE_URL'; // <-- replace
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // <-- replace

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ------------------ UI Elements ------------------ */
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const signoutBtn = document.getElementById('signout-btn');
const userArea = document.getElementById('user-area');
const userEmailSpan = document.getElementById('user-email');

const signinBtn = document.getElementById('signin-btn');
const signupBtn = document.getElementById('signup-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

const subjectsList = document.getElementById('subjects-list');
const subjectForm = document.getElementById('subject-form');
const subjectTitleInput = document.getElementById('subject-title');

const quickTitle = document.getElementById('quick-title');
const quickDue = document.getElementById('quick-due');
const quickAddBtn = document.getElementById('quick-add-btn');

const tasksList = document.getElementById('tasks-list');
const weekView = document.getElementById('week-view');

const importCanvasBtn = document.getElementById('import-canvas-btn');
const canvasTokenInput = document.getElementById('canvas-token');
const canvasCourseInput = document.getElementById('canvas-course-id');

let currentUser = null;

/* ------------------ Auth & Init ------------------ */
async function init() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user ?? null;
  renderAuthState();

  // Listen for auth changes (sign-in/out)
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    renderAuthState();
    if (currentUser) refreshAll();
  });
}

function renderAuthState() {
  if (currentUser) {
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    userArea.classList.remove('hidden');
    userEmailSpan.textContent = currentUser.email;
  } else {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    userArea.classList.add('hidden');
  }
}

/* ------------------ Auth Handlers ------------------ */
signinBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return alert('Provide email and password');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Sign in error: ' + error.message);
  currentUser = data.user;
  renderAuthState();
  refreshAll();
});

signupBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return alert('Provide email and password');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return alert('Sign up error: ' + error.message);
  alert('Sign-up email sent (check inbox). You may need to confirm before some providers allow sign-in.');
});

signoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null;
  renderAuthState();
});

/* ------------------ Subjects ------------------ */
subjectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = subjectTitleInput.value.trim();
  if (!title) return;
  const { error } = await supabase.from('subjects').insert([{ title }]);
  if (error) return alert('Error creating subject: ' + error.message);
  subjectTitleInput.value = '';
  refreshSubjects();
});

async function refreshSubjects() {
  const { data, error } = await supabase.from('subjects').select('*').order('title', { ascending: true });
  if (error) { console.error(error); return; }
  subjectsList.innerHTML = '';
  data.forEach(s => {
    const li = document.createElement('li');
    li.className = 'subject';
    li.innerHTML = `<span>${s.title}</span><button class="btn" data-id="${s.id}">Open</button>`;
    subjectsList.appendChild(li);
  });
}

/* ------------------ Tasks ------------------ */
quickAddBtn.addEventListener('click', async () => {
  const title = quickTitle.value.trim();
  const dueDate = quickDue.value ? new Date(quickDue.value).toISOString() : null;
  if (!title) return alert('Task title required');
  const payload = { title, due_at: dueDate };
  const { error } = await supabase.from('tasks').insert([payload]);
  if (error) return alert('Error creating task: ' + error.message);
  quickTitle.value = ''; quickDue.value = '';
  refreshTasks();
});

async function refreshTasks() {
  const { data, error } = await supabase.from('tasks').select('*').order('due_at', { ascending: true });
  if (error) { console.error(error); return; }
  renderTaskList(data);
  renderWeekView(data);
}

function renderTaskList(tasks) {
  tasksList.innerHTML = '';
  if (!tasks.length) tasksList.innerHTML = '<p class="muted">No tasks — add one with Quick add.</p>';
  tasks.forEach(t => {
    const div = document.createElement('div');
    div.className = 'task';
    const due = t.due_at ? new Date(t.due_at).toLocaleDateString() : 'No due';
    div.innerHTML = `
      <div>
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">${escapeHtml(t.description || '')} • ${due}</div>
      </div>
      <div>
        <button class="btn delete-btn" data-id="${t.id}">Delete</button>
      </div>
    `;
    tasksList.appendChild(div);
  });

  document.querySelectorAll('.delete-btn').forEach(b => {
    b.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) return alert('Delete error: ' + error.message);
      refreshTasks();
    });
  });
}

function renderWeekView(tasks) {
  weekView.innerHTML = '';
  weekView.classList.add('hidden');
  if (!tasks.length) return;
  // Build a simple 7-day grid from today
  const start = new Date();
  start.setHours(0,0,0,0);
  const days = [];
  for (let i=0;i<7;i++){
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: d, tasks: [] });
  }
  tasks.forEach(t => {
    if (!t.due_at) return;
    const d = new Date(t.due_at);
    days.forEach(day => {
      if (isSameDay(d, day.date)) day.tasks.push(t);
    });
  });

  // Create DOM
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7,1fr)';
  grid.style.gap = '8px';
  days.forEach(day => {
    const col = document.createElement('div');
    col.className = 'card';
    const label = document.createElement('div');
    label.innerHTML = `<strong>${day.date.toLocaleDateString(undefined, { weekday:'short' })}</strong><div class="muted">${day.date.toLocaleDateString()}</div>`;
    col.appendChild(label);
    if (!day.tasks.length) {
      const p = document.createElement('p'); p.className='muted'; p.textContent = '—';
      col.appendChild(p);
    } else {
      day.tasks.forEach(t => {
        const tdiv = document.createElement('div');
        tdiv.style.marginTop = '8px';
        tdiv.innerHTML = `<div style="font-weight:600">${escapeHtml(t.title)}</div><div class="muted">${t.due_at ? new Date(t.due_at).toLocaleTimeString() : ''}</div>`;
        col.appendChild(tdiv);
      });
    }
    grid.appendChild(col);
  });
  weekView.appendChild(grid);
}

/* ------------------ LMS / Canvas import ------------------ */
importCanvasBtn.addEventListener('click', async () => {
  const token = canvasTokenInput.value.trim();
  const courseId = canvasCourseInput.value.trim();
  if (!token || !courseId) return alert('Canvas token and course ID required');
  const base = detectCanvasBase();
  if (!base) return alert('Could not detect Canvas base URL. For Canvas Cloud use https://canvas.instructure.com. For self-hosted add your subdomain to the token input e.g. https://school.instructure.com|TOKEN');
  const url = `${base}/api/v1/courses/${courseId}/assignments`;
  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
    if (!res.ok) {
      const text = await res.text();
      return alert('Canvas fetch error: ' + res.status + ' - ' + text);
    }
    const assignments = await res.json();
    // Map and insert assignments as tasks
    const toInsert = assignments.map(a => ({
      title: a.name,
      description: a.description || '',
      due_at: a.due_at,
      external_id: a.id,
      external_source: 'canvas',
      // optionally map course -> subject later
    }));
    const { error } = await supabase.from('tasks').insert(toInsert);
    if (error) return alert('Error saving imported tasks: ' + error.message);
    alert(`Imported ${toInsert.length} assignments`);
    refreshTasks();
  } catch (err) {
    alert('Canvas import failed: ' + err.message);
  }
});

function detectCanvasBase(){
  // Allow token input to contain a base separated by |
  const tok = canvasTokenInput.value.trim();
  if (tok.includes('|')) {
    const [base, token] = tok.split('|');
    // override token input so header uses token
    canvasTokenInput.value = token;
    return base.replace(/\/$/, '');
  }
  // default to canvas cloud
  return 'https://canvas.instructure.com';
}

/* ------------------ Utilities ------------------ */
function isSameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function escapeHtml(str){
  if(!str) return '';
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ------------------ Refresh all data ------------------ */
async function refreshAll() {
  await Promise.all([refreshSubjects(), refreshTasks()]);
}

/* ------------------ Init on load ------------------ */
init();