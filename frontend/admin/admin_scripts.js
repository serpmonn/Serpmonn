// === ADMIN PANEL — EMPLOYEE MANAGEMENT ===
// Токен хранится в httpOnly cookie admin_token — все запросы идут с credentials: 'include'

const API = '/api/admin';
const PER_PAGE = 15;

let allEmployees = [];
let filtered = [];
let currentPage = 1;
let editingId = null;
let deleteTargetId = null;

// --- AUTH ---
async function checkAuth() {
    try {
        const r = await fetch(`${API}/me`, { credentials: 'include' });
        if (!r.ok) redirect();
    } catch { redirect(); }
}

function redirect() {
    window.location.href = '/frontend/admin/login.html';
}

// --- UI HELPERS ---
function showAlert(msg, type = 'success') {
    const box = document.getElementById('alertBox');
    box.textContent = msg;
    box.className = `alert ${type}`;
    box.style.display = 'block';
    setTimeout(() => { box.style.display = 'none'; }, 4000);
}

function statusLabel(s) {
    const map = { active: 'Активен', inactive: 'Неактивен', on_leave: 'В отпуске' };
    return map[s] || s;
}

function roleLabel(r) {
    const map = { admin: 'Администратор', moderator: 'Модератор', editor: 'Редактор', support: 'Поддержка', developer: 'Разработчик', marketer: 'Маркетолог' };
    return map[r] || r;
}

function formatDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('ru-RU'); } catch { return d; }
}

// --- FILTERS & RENDER ---
function applyFilters() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const role = document.getElementById('roleFilter').value;
    filtered = allEmployees.filter(e => {
        const matchQ = !q || [e.first_name, e.last_name, e.email, e.position, e.role]
            .some(f => f && f.toLowerCase().includes(q));
        const matchRole = !role || e.role === role;
        return matchQ && matchRole;
    });
    currentPage = 1;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('employeesTbody');
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PER_PAGE;
    const page = filtered.slice(start, start + PER_PAGE);

    if (page.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Сотрудники не найдены</td></tr>`;
    } else {
        tbody.innerHTML = page.map(e => `
            <tr>
                <td><div class="emp-name">${esc(e.first_name)} ${esc(e.last_name)}</div></td>
                <td>${esc(e.email)}</td>
                <td><span class="role-badge">${esc(roleLabel(e.role))}</span></td>
                <td>${esc(e.position || '—')}</td>
                <td><span class="status-badge status-${e.status || 'active'}">${statusLabel(e.status || 'active')}</span></td>
                <td>${formatDate(e.hire_date)}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-icon edit" title="Редактировать" onclick="openEdit('${e.id}')">✏️</button>
                        <button class="btn-icon delete" title="Удалить" onclick="openDelete('${e.id}', '${esc(e.first_name)} ${esc(e.last_name)}')">🗑</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const el = document.getElementById('pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    html += `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && Math.abs(i - currentPage) > 2 && i !== 1 && i !== totalPages) {
            if (i === 2 || i === totalPages - 1) html += `<span style="padding:0 4px;color:#aaa">…</span>`;
            continue;
        }
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
    el.innerHTML = html;
}

window.goPage = p => { currentPage = p; renderTable(); };

// --- LOAD ---
async function loadEmployees() {
    document.getElementById('employeesTbody').innerHTML =
        '<tr><td colspan="7" class="loading-cell">Загрузка...</td></tr>';
    try {
        const r = await fetch(`${API}/employees`, { credentials: 'include' });
        if (r.status === 401) { redirect(); return; }
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        allEmployees = Array.isArray(data) ? data : (data.employees || []);
        applyFilters();
    } catch (err) {
        document.getElementById('employeesTbody').innerHTML =
            `<tr><td colspan="7" class="empty-cell">Ошибка загрузки: ${esc(err.message)}</td></tr>`;
    }
}

// --- MODAL: CREATE / EDIT ---
function openCreate() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Добавить сотрудника';
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    document.getElementById('fpassword').required = true;
    document.querySelector('#passwordGroup small').style.display = 'none';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('fname').focus();
}

window.openEdit = function(id) {
    const e = allEmployees.find(x => String(x.id) === String(id));
    if (!e) return;
    editingId = id;
    document.getElementById('modalTitle').textContent = 'Редактировать сотрудника';
    document.getElementById('employeeId').value = id;
    document.getElementById('fname').value = e.first_name || '';
    document.getElementById('lname').value = e.last_name || '';
    document.getElementById('femail').value = e.email || '';
    document.getElementById('frole').value = e.role || '';
    document.getElementById('fposition').value = e.position || '';
    document.getElementById('fstatus').value = e.status || 'active';
    document.getElementById('fhire_date').value = e.hire_date ? e.hire_date.slice(0, 10) : '';
    document.getElementById('fpassword').value = '';
    document.getElementById('fpassword').required = false;
    document.querySelector('#passwordGroup small').style.display = 'block';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('fname').focus();
};

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    editingId = null;
}

// --- MODAL: DELETE ---
window.openDelete = function(id, name) {
    deleteTargetId = id;
    document.getElementById('deleteConfirmText').textContent =
        `Удалить сотрудника «${name}»? Это действие необратимо.`;
    document.getElementById('deleteOverlay').classList.add('open');
};

function closeDelete() {
    document.getElementById('deleteOverlay').classList.remove('open');
    deleteTargetId = null;
}

// --- SAVE ---
async function saveEmployee(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Сохранение...';

    const body = {
        first_name: document.getElementById('fname').value.trim(),
        last_name:  document.getElementById('lname').value.trim(),
        email:      document.getElementById('femail').value.trim(),
        role:       document.getElementById('frole').value,
        position:   document.getElementById('fposition').value.trim(),
        status:     document.getElementById('fstatus').value,
        hire_date:  document.getElementById('fhire_date').value || null,
    };

    const pw = document.getElementById('fpassword').value;
    if (pw) body.password = pw;

    try {
        const url = editingId ? `${API}/employees/${editingId}` : `${API}/employees`;
        const method = editingId ? 'PUT' : 'POST';
        const r = await fetch(url, {
            method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (r.status === 401) { redirect(); return; }
        if (!r.ok) {
            const err = await r.json().catch(() => ({ message: r.statusText }));
            throw new Error(err.message || r.statusText);
        }
        closeModal();
        showAlert(editingId ? 'Сотрудник обновлён' : 'Сотрудник добавлен', 'success');
        await loadEmployees();
    } catch (err) {
        showAlert('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Сохранить';
    }
}

// --- DELETE ---
async function confirmDelete() {
    if (!deleteTargetId) return;
    const btn = document.getElementById('deleteConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Удаление...';
    try {
        const r = await fetch(`${API}/employees/${deleteTargetId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (r.status === 401) { redirect(); return; }
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || r.statusText);
        closeDelete();
        showAlert('Сотрудник удалён', 'success');
        await loadEmployees();
    } catch (err) {
        showAlert('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Удалить';
    }
}

// --- LOGOUT ---
async function logout() {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = '/frontend/admin/login.html';
}

// --- ESC HTML ---
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadEmployees();

    document.getElementById('addEmployeeBtn').addEventListener('click', openCreate);
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('employeeForm').addEventListener('submit', saveEmployee);

    document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);
    document.getElementById('deleteCancelBtn').addEventListener('click', closeDelete);
    document.getElementById('deleteCancelX').addEventListener('click', closeDelete);

    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('roleFilter').addEventListener('change', applyFilters);

    document.getElementById('modalOverlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.getElementById('deleteOverlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDelete();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeModal(); closeDelete(); }
    });
});
