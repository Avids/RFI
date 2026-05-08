const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const today = new Date().toISOString().slice(0, 10);
const addDays = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const id = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
const fmtDate = (value) => value ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '';
const fmtStamp = (value) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
const normalizeAttachment = (attachment) => typeof attachment === 'string' ? { id: id('att'), name: attachment, type: attachment.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream', dataUrl: '', includeInExport: false } : attachment;
const fileToAttachment = (file) => new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve({ id: id('att'), name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataUrl: String(reader.result), includeInExport: file.type === 'application/pdf' }); reader.readAsDataURL(file); });

const seed = {
  companies: [{ id: 'company-sprint', name: 'Sprint Mechanical Inc', address: '50 Woodbine Downs Blvd\nToronto, Ontario M9W 5R2', phone: '416-747-6059', logo: '' }],
  users: [
    { id: 'user-admin', name: 'Ashley Amorim-Djazayeri', email: 'admin@sprint.local', companyId: 'company-sprint', role: 'admin', status: 'approved', projectIds: ['project-clarkson'] },
    { id: 'user-pending', name: 'Meet Dabhi', email: 'meet@adec.local', companyId: 'company-sprint', role: 'user', status: 'pending', projectIds: ['project-clarkson'] }
  ],
  projects: [{ id: 'project-clarkson', number: '4617 4617', name: 'IESO Clarkson CSCCR', address: '2635 Lakeshore Rd West', city: 'Mississauga, Ontario', stage: 'Construction', companyId: 'company-sprint' }],
  receiverNames: ['Ashley Amorim-Djazayeri (Sprint Mechanical Inc)', 'Meet Dabhi (ADEC Electrical Services Ltd)', 'Daniel Barnes (Sprint Mechanical Inc)', 'Jamie Chalmers (ADEC Electrical Services Ltd)', 'Andre Herrmann (Sprint Mechanical Inc)'],
  rfis: [{
    id: 'rfi-66', projectId: 'project-clarkson', number: 66, revision: 0, title: 'New BAS Panel for FC 1&2 Power', status: 'Open',
    to: 'Ashley Amorim-Djazayeri (Sprint Mechanical Inc)', from: 'Ashley Amorim-Djazayeri (Sprint Mechanical Inc)', dateInitiated: today, dueDate: addDays(3),
    location: '', costImpact: '', scheduleImpact: '', specSection: '', projectStage: '', costCode: '', drawingNumber: '', reference: '', linkedDrawings: '',
    receivedFrom: 'Meet Dabhi (ADEC Electrical Services Ltd)', copiesTo: 'Ashley Amorim-Djazayeri (Sprint Mechanical Inc), Daniel Barnes (Sprint Mechanical Inc), Jamie Chalmers (ADEC Electrical Services Ltd), Meet Dabhi (ADEC Electrical Services Ltd), Andre Herrmann (Sprint Mechanical Inc)',
    threads: [{ id: 'thread-1', type: 'Question', author: 'Ashley Amorim-Djazayeri', company: 'Sprint Mechanical Inc', createdAt: new Date().toISOString(), body: 'Please refer to attached RFI from Adec for processing.', attachments: [{ id: 'att-demo', name: 'RFI 25386-03 - New BAS panel for fluid cooler 1&2 power.pdf', type: 'application/pdf', dataUrl: '', includeInExport: false }] }]
  }],
  currentUserId: 'user-admin'
};

let store = hydrateStore(loadStore());
let view = 'dashboard';
let selectedProjectId = 'project-clarkson';
let selectedRfiId = 'rfi-66';
let draftRfi = null;
let searchTerm = '';
let dbBusy = false;
let dbMessage = '';

function hydrateStore(raw) {
  const next = { ...seed, ...raw };
  next.companies = next.companies || [];
  next.users = next.users || [];
  next.projects = next.projects || [];
  next.receiverNames = Array.from(new Set([...(next.receiverNames || []), ...seed.receiverNames]));
  next.rfis = (next.rfis || []).map((rfi) => ({ ...rfi, threads: (rfi.threads || []).map((thread) => ({ ...thread, attachments: (thread.attachments || []).map(normalizeAttachment) })) }));
  return next;
}
function loadStore() { try { return JSON.parse(localStorage.getItem('rfi-manager-store')) || seed; } catch { return seed; } }
function databaseSettings() { try { return JSON.parse(localStorage.getItem('rfi-database-settings')) || {}; } catch { return {}; } }
function saveDatabaseSettings(settings) { localStorage.setItem('rfi-database-settings', JSON.stringify(settings)); }
function saveStore(sync = true) { localStorage.setItem('rfi-manager-store', JSON.stringify(store)); if (sync && databaseSettings().autoSync) pushDatabase(false); }
function currentUser() { return store.users.find((user) => user.id === store.currentUserId); }
function currentCompany() { return store.companies.find((company) => company.id === currentUser()?.companyId) || store.companies[0]; }
function visibleProjects() { const user = currentUser(); return store.projects.filter((project) => user?.role === 'admin' || user?.projectIds.includes(project.id)); }
function selectedProject() { return store.projects.find((project) => project.id === selectedProjectId) || visibleProjects()[0] || store.projects[0]; }
function projectRfis() { return store.rfis.filter((rfi) => rfi.projectId === selectedProject()?.id); }
function selectedRfi() { return store.rfis.find((rfi) => rfi.id === selectedRfiId) || projectRfis()[0] || store.rfis[0]; }
function setStore(next) { store = hydrateStore(typeof next === 'function' ? next(store) : next); saveStore(); render(); }
function setView(next) { view = next; draftRfi = null; render(); }
function blankRfi(projectId) {
  const user = currentUser(); const company = currentCompany(); const identity = `${user.name} (${company.name})`;
  return { id: id('rfi'), projectId, number: Math.max(0, ...store.rfis.map((r) => r.number)) + 1, revision: 0, title: '', status: 'Open', to: '', from: identity, dateInitiated: today, dueDate: addDays(7), location: '', costImpact: '', scheduleImpact: '', specSection: '', projectStage: '', costCode: '', drawingNumber: '', reference: '', linkedDrawings: '', receivedFrom: '', copiesTo: '', threads: [] };
}
function rememberReceivers(...values) {
  const names = values.flatMap((value) => String(value || '').split(',')).map((name) => name.trim()).filter(Boolean);
  store.receiverNames = Array.from(new Set([...(store.receiverNames || []), ...names]));
}
function peopleDatalist() { return `<datalist id="peopleList">${(store.receiverNames || []).map((name) => `<option value="${escapeHtml(name)}"></option>`).join('')}</datalist>`; }
function attachmentLink(attachment) { return attachment.dataUrl ? `<a href="${attachment.dataUrl}" download="${escapeHtml(attachment.name)}">${escapeHtml(attachment.name)}</a>` : `<a href="#">${escapeHtml(attachment.name)}</a>`; }
function pdfAttachments(rfi) { return rfi.threads.flatMap((thread) => (thread.attachments || []).map(normalizeAttachment)).filter((att) => att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf')); }

async function databaseRequest(method, query, body) {
  const settings = databaseSettings();
  if (!settings.url || !settings.key) throw new Error('Add Supabase URL and anon/service key first.');
  const response = await fetch(`${settings.url.replace(/\/$/, '')}/rest/v1/rfi_store${query}`, {
    method,
    headers: { apikey: settings.key, Authorization: `Bearer ${settings.key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  return response.status === 204 ? null : response.json();
}
async function pullDatabase(announce = true) {
  dbBusy = true; dbMessage = 'Loading database...'; renderDatabase();
  try {
    const rows = await databaseRequest('GET', '?id=eq.default&select=data', null);
    if (rows?.[0]?.data) { store = hydrateStore(rows[0].data); saveStore(false); dbMessage = 'Database loaded into this browser.'; render(); }
    else { dbMessage = 'No database row found yet. Use Push Database to create it.'; renderDatabase(); }
  } catch (error) { dbMessage = `Database load failed: ${error.message}`; renderDatabase(); }
  finally { dbBusy = false; if (announce) renderDatabase(); }
}
async function pushDatabase(announce = true) {
  if (dbBusy) return;
  dbBusy = true; dbMessage = 'Saving database...'; if (announce) renderDatabase();
  try { await databaseRequest('POST', '', { id: 'default', data: store, updated_at: new Date().toISOString() }); dbMessage = 'Database saved.'; }
  catch (error) { dbMessage = `Database save failed: ${error.message}`; }
  finally { dbBusy = false; if (announce) renderDatabase(); }
}

function render() {
  const user = currentUser();
  if (!user || user.status !== 'approved') { renderAuth(); return; }
  const company = currentCompany();
  const projects = visibleProjects();
  $('#app').innerHTML = `<main class="app-shell"><aside class="sidebar no-print"><div class="brand-mark"><span>R</span> RFI Manager</div><p>Construction RFI generation, account approval, database sync, project setup, company branding, and PDF-ready exports.</p><nav>${['dashboard','rfis','projects','company','database','admin'].map((item) => `<button class="nav-button ${view === item ? 'active' : ''}" data-view="${item}">${item[0].toUpperCase() + item.slice(1)}</button>`).join('')}</nav><small>Signed in as<br><strong>${escapeHtml(user.name)}</strong><br>${escapeHtml(user.email)}</small><button class="ghost" id="signout">Sign out</button></aside><section class="content"><div class="topbar no-print"><div><div class="eyebrow">${escapeHtml(company.name)}</div><h1>Construction RFI Manager</h1></div><div class="toolbar"><select id="projectPicker">${projects.map((project) => `<option value="${project.id}" ${project.id === selectedProject()?.id ? 'selected' : ''}>${escapeHtml(project.number)} - ${escapeHtml(project.name)}</option>`).join('')}</select><button class="primary" id="newRfi">+ New RFI</button></div></div><div id="viewRoot"></div></section></main>`;
  $$('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#signout').addEventListener('click', () => setStore((s) => ({ ...s, currentUserId: undefined })));
  $('#projectPicker')?.addEventListener('change', (event) => { selectedProjectId = event.target.value; selectedRfiId = projectRfis()[0]?.id || selectedRfiId; setView('rfis'); });
  $('#newRfi').addEventListener('click', () => { const rfi = blankRfi(selectedProject().id); store.rfis.push(rfi); selectedRfiId = rfi.id; saveStore(); setView('rfis'); });
  if (view === 'dashboard') renderDashboard();
  if (view === 'rfis') renderRfis();
  if (view === 'projects') renderProjects();
  if (view === 'company') renderCompany();
  if (view === 'database') renderDatabase();
  if (view === 'admin') renderAdmin();
  if (view === 'export') renderExport();
}

function renderAuth() {
  $('#app').innerHTML = `<main class="auth-wrap"><section class="card auth-card"><div class="auth-hero"><div class="brand-mark"><span>R</span> RFI Manager</div><h1>Email login with admin approval</h1><p>Create a company-backed account, then wait for an administrator to approve access and assign projects.</p><p>Demo admin: admin@sprint.local</p></div><form class="grid" id="authForm" style="padding:34px"><select id="authMode"><option value="login">Login</option><option value="register">Create account</option></select><div id="registerFields"></div><label>Email<input required type="email" id="email"></label><button class="primary" id="authButton">Login</button></form></section></main>`;
  const mode = $('#authMode');
  const sync = () => { $('#registerFields').innerHTML = mode.value === 'register' ? '<label>Name<input required id="name"></label><label>Company<input required id="company"></label>' : ''; $('#authButton').textContent = mode.value === 'login' ? 'Login' : 'Request approval'; };
  mode.addEventListener('change', sync); sync();
  $('#authForm').addEventListener('submit', (event) => {
    event.preventDefault(); const email = $('#email').value.trim(); const found = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (mode.value === 'login') { if (found?.status === 'approved') setStore((s) => ({ ...s, currentUserId: found.id })); else alert(found ? 'Account is still pending admin approval.' : 'No approved account found for this email.'); return; }
    const companyId = id('company'); const userId = id('user');
    setStore((s) => ({ ...s, companies: [...s.companies, { id: companyId, name: $('#company').value.trim(), address: '', phone: '', logo: '' }], users: [...s.users, { id: userId, name: $('#name').value.trim(), email, companyId, role: 'user', status: 'pending', projectIds: [] }] }));
    alert('Account requested. An admin must approve it before login.');
  });
}

function renderDashboard() {
  const open = store.rfis.filter((r) => r.status !== 'Closed').length; const pending = store.users.filter((u) => u.status === 'pending').length;
  $('#viewRoot').innerHTML = `<div class="grid"><div class="grid three"><div class="card"><h3>Assigned projects</h3><h1>${visibleProjects().length}</h1></div><div class="card"><h3>Open RFIs</h3><h1>${open}</h1></div><div class="card"><h3>Pending approvals</h3><h1>${pending}</h1></div></div><div class="card"><h2>Recent RFIs</h2><table class="table"><tbody>${store.rfis.slice(-5).map((r) => `<tr><td><strong>RFI #${r.number}</strong>: ${escapeHtml(r.title)}</td><td><span class="pill ${r.status === 'Closed' ? 'closed' : 'open'}">${r.status}</span></td><td>${r.threads.length} thread(s)</td></tr>`).join('')}</tbody></table><button class="secondary" id="manageRfis">Manage RFIs</button></div><div class="card"><h2>Database workflow</h2><p>Use the Database tab to connect a Supabase table named <code>rfi_store</code>, then pull or push the shared RFI database from Vercel.</p></div></div>`;
  $('#manageRfis').addEventListener('click', () => setView('rfis'));
}

function renderRfis() {
  const term = searchTerm.trim().toLowerCase();
  const rfis = projectRfis().filter((rfi) => !term || [rfi.title, ...rfi.threads.map((t) => t.body)].join(' ').toLowerCase().includes(term));
  const activeRfi = selectedRfi() || blankRfi(selectedProject().id);
  if (!draftRfi || draftRfi.id !== activeRfi.id) draftRfi = structuredClone(activeRfi);
  $('#viewRoot').innerHTML = `${peopleDatalist()}<div class="grid two"><div class="card"><h2>RFI list</h2><label>Search titles, questions, or answers<input id="rfiSearch" value="${escapeHtml(searchTerm)}" placeholder="Search RFI title or thread text..."></label>${rfis.length ? `<table class="table"><tbody>${rfis.map((r) => `<tr class="rfi-row" data-id="${r.id}" style="cursor:pointer;background:${r.id === selectedRfi().id ? '#f0f6ff' : 'transparent'}"><td><strong>#${r.number}</strong></td><td>${escapeHtml(r.title || 'Untitled RFI')}</td><td><span class="pill ${r.status === 'Closed' ? 'closed' : 'open'}">${r.status}</span></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No matching RFIs. Try a different search or create a new RFI.</div>'}</div><div class="card"><div class="toolbar" style="justify-content:space-between"><h2>RFI #${draftRfi.number}</h2><div class="toolbar"><button class="secondary" id="exportRfi">Export / Print</button><button class="primary" id="saveRfi">Save RFI</button></div></div><form id="rfiForm" class="grid"><div class="grid two">${input('title','Title')}${select('status','Status',['Open','Awaiting Response','Closed'])}${input('revision','Revision','number')}${input('dueDate','Due Date','date')}${peopleInput('to','To')}${peopleInput('from','From')}${peopleInput('receivedFrom','Received From')}${peopleInput('copiesTo','Copies To')}${input('location','Location')}${input('projectStage','Project Stage')}${input('costImpact','Cost Impact')}${input('scheduleImpact','Schedule Impact')}${input('specSection','Spec Section')}${input('costCode','Cost Code')}${input('drawingNumber','Drawing Number')}${input('reference','Reference')}</div><label>Linked Drawings<textarea name="linkedDrawings">${escapeHtml(draftRfi.linkedDrawings)}</textarea></label></form><h3 style="margin-top:18px">Activity threads</h3><div id="threads">${draftRfi.threads.map(threadHtml).join('')}</div><div class="grid"><select id="threadType"><option>Question</option><option>Response</option><option>Clarification</option></select><textarea id="threadBody" placeholder="Add a question, response, or clarification to the RFI thread"></textarea><label>Attachments (PDF, images, documents, spreadsheets)<input id="threadFiles" type="file" multiple></label><button class="secondary" id="addThread">Add to thread</button></div></div></div>`;
  $('#rfiSearch').addEventListener('input', (event) => { searchTerm = event.target.value; renderRfis(); });
  $$('.rfi-row').forEach((row) => row.addEventListener('click', () => { selectedRfiId = row.dataset.id; draftRfi = null; renderRfis(); }));
  $('#rfiForm').addEventListener('input', readDraftForm); $('#saveRfi').addEventListener('click', saveDraft); $('#exportRfi').addEventListener('click', () => { saveDraft(false); setView('export'); });
  $('#addThread').addEventListener('click', async () => { readDraftForm(); const body = $('#threadBody').value.trim(); const files = await Promise.all(Array.from($('#threadFiles').files || []).map(fileToAttachment)); if (!body && files.length === 0) return; draftRfi.threads.push({ id: id('thread'), type: $('#threadType').value, author: currentUser().name, company: currentCompany().name, createdAt: new Date().toISOString(), body, attachments: files }); renderRfis(); });
}
function input(name,label,type='text'){ return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(draftRfi[name])}"></label>`; }
function peopleInput(name,label){ return `<label>${label}<input name="${name}" list="peopleList" value="${escapeHtml(draftRfi[name])}" placeholder="Start typing a saved receiver..."></label>`; }
function select(name,label,options){ return `<label>${label}<select name="${name}">${options.map((option) => `<option ${draftRfi[name] === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>`; }
function threadHtml(t){ return `<div class="thread-box"><div class="thread-meta">${t.type} from ${escapeHtml(t.author)} ${escapeHtml(t.company)} <em>on ${fmtStamp(t.createdAt)}</em></div><p>${escapeHtml(t.body)}</p>${(t.attachments || []).map(normalizeAttachment).map((a) => `${attachmentLink(a)} <span class="muted">${escapeHtml(a.type || '')}</span><br>`).join('')}</div>`; }
function readDraftForm(){ new FormData($('#rfiForm')).forEach((value,key) => { draftRfi[key] = key === 'revision' ? Number(value) : String(value); }); }
function saveDraft(announce = true){ readDraftForm(); rememberReceivers(draftRfi.to, draftRfi.from, draftRfi.receivedFrom, draftRfi.copiesTo); selectedRfiId = draftRfi.id; store.rfis = store.rfis.some((r) => r.id === draftRfi.id) ? store.rfis.map((r) => r.id === draftRfi.id ? draftRfi : r) : [...store.rfis, draftRfi]; saveStore(); if (announce) alert('RFI saved.'); }

function renderProjects() {
  $('#viewRoot').innerHTML = `<div class="grid"><div class="card"><h2>Project setup</h2><div class="grid three"><label>Project Number<input id="projectNumber"></label><label>Project Name<input id="projectName"></label><label>Stage<input id="projectStage" value="Construction"></label><label>Address<input id="projectAddress"></label><label>City<input id="projectCity"></label></div><button class="primary" style="margin-top:14px" id="createProject">Create project</button></div><div class="card"><h2>Assign projects to users</h2><table class="table"><tbody>${store.users.map((u) => `<tr><td><strong>${escapeHtml(u.name)}</strong><br>${escapeHtml(u.email)}</td><td>${store.projects.map((p) => `<label style="display:inline-flex;margin-right:12px"><input type="checkbox" class="assign" data-user="${u.id}" data-project="${p.id}" ${u.projectIds.includes(p.id) ? 'checked' : ''}> ${escapeHtml(p.number)} ${escapeHtml(p.name)}</label>`).join('')}</td></tr>`).join('')}</tbody></table></div></div>`;
  $('#createProject').addEventListener('click', () => { const project = { id: id('project'), number: $('#projectNumber').value, name: $('#projectName').value, stage: $('#projectStage').value, address: $('#projectAddress').value, city: $('#projectCity').value, companyId: currentCompany().id }; setStore((s) => ({ ...s, projects: [...s.projects, project] })); });
  $$('.assign').forEach((box) => box.addEventListener('change', () => setStore((s) => ({ ...s, users: s.users.map((u) => u.id === box.dataset.user ? { ...u, projectIds: u.projectIds.includes(box.dataset.project) ? u.projectIds.filter((p) => p !== box.dataset.project) : [...u.projectIds, box.dataset.project] } : u) }))));
}

function renderCompany() {
  const company = currentCompany();
  $('#viewRoot').innerHTML = `<div class="card"><h2>Company branding</h2><p>Logo, company name, address, and phone appear on every exported RFI.</p><div class="grid two"><label>Company Name<input id="companyName" value="${escapeHtml(company.name)}"></label><label>Phone<input id="companyPhone" value="${escapeHtml(company.phone)}"></label><label>Address<textarea id="companyAddress">${escapeHtml(company.address)}</textarea></label><label>Logo<input id="companyLogo" type="file" accept="image/*">${company.logo ? `<img src="${company.logo}" class="logo-preview" alt="Company logo preview">` : ''}</label></div><button class="primary" style="margin-top:14px" id="saveCompany">Save company</button></div>`;
  $('#saveCompany').addEventListener('click', () => setStore((s) => ({ ...s, companies: s.companies.map((c) => c.id === company.id ? { ...c, name: $('#companyName').value, phone: $('#companyPhone').value, address: $('#companyAddress').value } : c) })));
  $('#companyLogo').addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setStore((s) => ({ ...s, companies: s.companies.map((c) => c.id === company.id ? { ...c, logo: String(reader.result) } : c) })); reader.readAsDataURL(file); });
}

function renderDatabase() {
  if (!$('#viewRoot')) return;
  const settings = databaseSettings();
  $('#viewRoot').innerHTML = `<div class="card"><h2>Database</h2><p>Connect this Vercel app to a Supabase database. Create table <code>rfi_store</code> with columns <code>id text primary key</code>, <code>data jsonb</code>, and <code>updated_at timestamptz</code>.</p><div class="grid two"><label>Supabase Project URL<input id="dbUrl" value="${escapeHtml(settings.url || '')}" placeholder="https://...supabase.co"></label><label>Supabase API Key<input id="dbKey" value="${escapeHtml(settings.key || '')}" type="password" placeholder="anon or service key"></label><label style="display:flex;align-items:center;gap:8px"><input id="dbAuto" type="checkbox" ${settings.autoSync ? 'checked' : ''}> Auto-push saved changes</label></div><div class="toolbar" style="margin-top:14px"><button class="primary" id="saveDbSettings">Save Settings</button><button class="secondary" id="pullDb" ${dbBusy ? 'disabled' : ''}>Pull Database</button><button class="secondary" id="pushDb" ${dbBusy ? 'disabled' : ''}>Push Database</button></div>${dbMessage ? `<p class="db-message">${escapeHtml(dbMessage)}</p>` : ''}<pre class="sql">create table if not exists rfi_store (\n  id text primary key,\n  data jsonb not null,\n  updated_at timestamptz default now()\n);</pre></div>`;
  $('#saveDbSettings').addEventListener('click', () => { saveDatabaseSettings({ url: $('#dbUrl').value.trim(), key: $('#dbKey').value.trim(), autoSync: $('#dbAuto').checked }); dbMessage = 'Database settings saved in this browser.'; renderDatabase(); });
  $('#pullDb').addEventListener('click', () => pullDatabase());
  $('#pushDb').addEventListener('click', () => pushDatabase());
}

function renderAdmin() {
  $('#viewRoot').innerHTML = `<div class="card"><h2>Admin account approval</h2><table class="table"><thead><tr><th>User</th><th>Company</th><th>Status</th><th>Role</th><th>Actions</th></tr></thead><tbody>${store.users.map((u) => `<tr><td><strong>${escapeHtml(u.name)}</strong><br>${escapeHtml(u.email)}</td><td>${escapeHtml(store.companies.find((c) => c.id === u.companyId)?.name || '')}</td><td><span class="pill ${u.status === 'pending' ? 'pending' : 'open'}">${u.status}</span></td><td>${u.role}</td><td class="toolbar">${u.status === 'pending' ? `<button class="primary approve" data-user="${u.id}">Approve</button>` : ''}<button class="secondary role" data-user="${u.id}">Toggle role</button></td></tr>`).join('')}</tbody></table></div>`;
  $$('.approve').forEach((button) => button.addEventListener('click', () => setStore((s) => ({ ...s, users: s.users.map((u) => u.id === button.dataset.user ? { ...u, status: 'approved' } : u) }))));
  $$('.role').forEach((button) => button.addEventListener('click', () => setStore((s) => ({ ...s, users: s.users.map((u) => u.id === button.dataset.user ? { ...u, role: u.role === 'admin' ? 'user' : 'admin' } : u) }))));
}

function renderExport() {
  const rfi = selectedRfi(); const company = currentCompany(); const project = selectedProject(); const pdfs = pdfAttachments(rfi);
  const field = (label, value = '') => `<div class="export-row"><div class="export-label">${label}</div><div>${escapeHtml(value)}</div></div>`;
  const selectedPdfs = pdfs.filter((att) => att.includeInExport && att.dataUrl);
  $('#viewRoot').innerHTML = `<div class="toolbar no-print" style="margin-bottom:18px"><button class="primary" id="print">Print / Save as PDF</button><button class="secondary" id="backToRfi">Back to RFI</button></div>${pdfs.length ? `<div class="card no-print export-options"><h3>PDF attachments to append to export</h3>${pdfs.map((att) => `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" class="pdfChoice" data-att="${att.id}" ${att.includeInExport ? 'checked' : ''} ${att.dataUrl ? '' : 'disabled'}> ${escapeHtml(att.name)} ${att.dataUrl ? '' : '(upload file content to append)'}</label>`).join('')}</div>` : ''}<article class="export-sheet"><header class="export-header"><div>${company.logo ? `<img src="${company.logo}" alt="${escapeHtml(company.name)} logo">` : `<div class="brand-mark" style="color:#111"><span>R</span>${escapeHtml(company.name)}</div>`}</div><div><strong>${escapeHtml(company.name)}</strong><br>${escapeHtml(company.address).replaceAll('\n','<br>')}<br>P: ${escapeHtml(company.phone)}</div><div class="export-project"><strong>Project: ${escapeHtml(project.number)} - ${escapeHtml(project.name)}</strong><br>${escapeHtml(project.address)}<br>${escapeHtml(project.city)}</div></header><div class="export-rule"></div><div class="export-title">RFI #${rfi.number}: ${escapeHtml(rfi.title)}</div><section class="export-fields">${field('Revision', rfi.revision)}${field('Status', rfi.status)}${field('To', rfi.to)}${field('From', rfi.from)}${field('Date Initiated', fmtDate(rfi.dateInitiated))}${field('Due Date', fmtDate(rfi.dueDate))}${field('Location', rfi.location)}${field('Project Stage', rfi.projectStage || project.stage)}${field('Cost Impact', rfi.costImpact)}${field('Schedule Impact', rfi.scheduleImpact)}${field('Spec Section', rfi.specSection)}${field('Cost Code', rfi.costCode)}${field('Drawing Number', rfi.drawingNumber)}${field('Reference', rfi.reference)}${field('Linked Drawings', rfi.linkedDrawings)}<span></span>${field('Received From', rfi.receivedFrom)}<span></span>${field('Copies To', rfi.copiesTo)}</section><section class="export-activity"><h2>Activity</h2>${rfi.threads.map((t) => `<div class="export-activity-grid"><div class="export-label">${t.type}</div><div class="export-thread"><div><strong>${t.type} from ${escapeHtml(t.author)} ${escapeHtml(t.company)}</strong> <em>on ${fmtStamp(t.createdAt)}</em></div><p>${escapeHtml(t.body)}</p>${(t.attachments || []).length ? `<strong>Attachments</strong><br>${(t.attachments || []).map(normalizeAttachment).map((a) => `${attachmentLink(a)}<br>`).join('')}` : ''}</div></div>`).join('')}${rfi.status !== 'Closed' ? '<div class="export-activity-grid"><span></span><em>Awaiting an Official Response</em></div>' : ''}</section><footer class="export-footer"><span>${escapeHtml(company.name)}</span><span>Page 1 of 1</span><span>Printed On: ${fmtStamp(new Date().toISOString())}</span></footer></article>${selectedPdfs.map((att) => `<section class="pdf-appendix"><h2>Attached PDF: ${escapeHtml(att.name)}</h2><embed src="${att.dataUrl}" type="application/pdf"></section>`).join('')}`;
  $$('.pdfChoice').forEach((box) => box.addEventListener('change', () => { store.rfis = store.rfis.map((item) => item.id === rfi.id ? { ...item, threads: item.threads.map((thread) => ({ ...thread, attachments: (thread.attachments || []).map(normalizeAttachment).map((att) => att.id === box.dataset.att ? { ...att, includeInExport: box.checked } : att) })) } : item); saveStore(); renderExport(); }));
  $('#print').addEventListener('click', () => window.print()); $('#backToRfi').addEventListener('click', () => setView('rfis'));
}

render();
