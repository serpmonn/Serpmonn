const API = '/api/admin';
const PER_PAGE = 15;

let allEmployees = [];
let filtered = [];
let currentPage = 1;
let editingId = null;
let deleteTargetId = null;

async function checkAuth() {
    try {
        const r = await fetch(`${API}/me`, { credentials: 'include' });
        if (!r.ok) redirect();
    } catch { redirect(); }
}

function redirect() {
    window.location.href = '/frontend/admin/login.html';
}

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
    const map = {
        admin: 'Администратор',
        moderator: 'Модератор',
        editor: 'Редактор',
        support: 'Поддержка',
        developer: 'Разработчик',
        marketer: 'Маркетолог',
        tester: 'Тестировщик',
    };
    return map[r] || r;
}

function formatDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('ru-RU'); } catch { return d; }
}

function transliterate(str) {
    const map = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'j','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
        'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'E','Ж':'Zh','З':'Z','И':'I','Й':'J','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Sch','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya'
    };
    return str.split('').map(c => map[c] !== undefined ? map[c] : c).join('');
}

function autoFillMailLocal() {
    const mailLocalInput = document.getElementById('fmailLocal');
    if (!mailLocalInput || document.getElementById('createMailbox')?.checked === false) return;
    if (mailLocalInput.dataset.manualEdit === 'true') return;
    const first = transliterate(document.getElementById('fname').value.trim()).toLowerCase().replace(/[^a-z0-9]/g, '');
    const last  = transliterate(document.getElementById('lname').value.trim()).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (first && last) mailLocalInput.value = `${first}.${last}`;
    else if (first) mailLocalInput.value = first;
}

function applyFilters() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const role = document.getElementById('roleFilter').value;
    filtered = allEmployees.filter(e => {
        const matchQ = !q || [e.first_name, e.last_name, e.email, e.mailbox, e.position, e.role].some(f => f && String(f).toLowerCase().includes(q));
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
        tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Сотрудники не найдены</td></tr>`;
    } else {
        tbody.innerHTML = page.map(e => `
            <tr>
                <td><div class="emp-name">${esc(e.first_name)} ${esc(e.last_name)}</div></td>
                <td>${esc(e.email)}</td>
                <td>${esc(e.mailbox || '—')}</td>
                <td><span class="role-badge">${esc(roleLabel(e.role))}</span></td>
                <td>${esc(e.position || '—')}</td>
                <td><span class="status-badge status-${e.status || 'active'}">${statusLabel(e.status || 'active')}</span></td>
                <td>${formatDate(e.hire_date)}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-icon edit" title="Редактировать" onclick="openEdit('${e.id}')">✏️</button>
                        <button class="btn-icon delete" title="Удалить" onclick="openDelete('${e.id}')">🗑</button>
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

async function loadEmployees() {
    document.getElementById('employeesTbody').innerHTML = '<tr><td colspan="8" class="loading-cell">Загрузка...</td></tr>';
    try {
        const r = await fetch(`${API}/employees`, { credentials: 'include' });
        if (r.status === 401) { redirect(); return; }
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        allEmployees = Array.isArray(data) ? data : (data.employees || []);
        applyFilters();
    } catch (err) {
        document.getElementById('employeesTbody').innerHTML = `<tr><td colspan="8" class="empty-cell">Ошибка загрузки: ${esc(err.message)}</td></tr>`;
    }
}

function openCreate() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Добавить сотрудника';
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    document.getElementById('fpassword').required = true;
    document.querySelector('#passwordGroup small').style.display = 'none';
    document.getElementById('mailboxSection').style.display = 'block';
    document.getElementById('createMailbox').checked = false;
    document.getElementById('mailboxFields').style.display = 'none';
    document.getElementById('fmailLocal').dataset.manualEdit = 'false';
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
    document.getElementById('mailboxSection').style.display = 'none';
    document.getElementById('createMailbox').checked = false;
    document.getElementById('mailboxFields').style.display = 'none';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('fname').focus();
};

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    editingId = null;
}

window.openDelete = function(id) {
    const e = allEmployees.find(x => String(x.id) === String(id));
    if (!e) return;
    deleteTargetId = id;
    document.getElementById('deleteConfirmText').textContent = `Удалить сотрудника «${e.first_name} ${e.last_name}»? Это действие необратимо.`;
    document.getElementById('deleteMailboxCheck').checked = false;
    document.getElementById('deleteMailboxInfo').textContent = e.mailbox ? `Будет удалён: ${e.mailbox}` : 'У сотрудника нет сохранённого корпоративного ящика';
    document.getElementById('deleteOverlay').classList.add('open');
};

function closeDelete() {
    document.getElementById('deleteOverlay').classList.remove('open');
    deleteTargetId = null;
}

async function saveEmployee(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Сохранение...';

    const needMailbox = !editingId && document.getElementById('createMailbox')?.checked;
    const mailLocal = document.getElementById('fmailLocal')?.value.trim();
    const mailPass = document.getElementById('fmailPassword')?.value;
    const mailbox = needMailbox && mailLocal ? `${mailLocal}@serpmonn.ru` : null;

    const body = {
        first_name: document.getElementById('fname').value.trim(),
        last_name: document.getElementById('lname').value.trim(),
        email: document.getElementById('femail').value.trim(),
        role: document.getElementById('frole').value,
        position: document.getElementById('fposition').value.trim(),
        status: document.getElementById('fstatus').value,
        hire_date: document.getElementById('fhire_date').value || null,
        mailbox
    };

    const pw = document.getElementById('fpassword').value;
    if (pw) body.password = pw;

    if (needMailbox) {
        if (!mailLocal) {
            showAlert('Укажите логин почтового ящика', 'error');
            btn.disabled = false; btn.textContent = 'Сохранить';
            return;
        }
        if (!mailPass || mailPass.length < 8) {
            showAlert('Пароль почты — минимум 8 символов', 'error');
            btn.disabled = false; btn.textContent = 'Сохранить';
            return;
        }
    }

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

        if (needMailbox) {
            btn.textContent = 'Создание ящика...';
            const mr = await fetch(`${API}/mailbox`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ localPart: mailLocal, password: mailPass }),
            });
            if (!mr.ok) {
                const merr = await mr.json().catch(() => ({ message: mr.statusText }));
                showAlert(`Сотрудник создан, но ящик не создан: ${merr.message}`, 'error');
                closeModal();
                await loadEmployees();
                return;
            }
            const mdata = await mr.json();
            showAlert(`Сотрудник добавлен. Ящик ${mdata.email} создан ✓`, 'success');
        } else {
            showAlert(editingId ? 'Сотрудник обновлён' : 'Сотрудник добавлен', 'success');
        }

        closeModal();
        await loadEmployees();
    } catch (err) {
        showAlert('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Сохранить';
    }
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    const btn = document.getElementById('deleteConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Удаление...';

    const deleteMailbox = document.getElementById('deleteMailboxCheck').checked;

    try {
        const r = await fetch(`${API}/employees/${deleteTargetId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleteMailbox }),
        });
        if (r.status === 401) { redirect(); return; }
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || r.statusText);
        const data = await r.json();
        closeDelete();
        if (deleteMailbox) {
            if (data.mailboxDeleted) showAlert('Сотрудник и почтовый ящик удалены ✓', 'success');
            else showAlert(`Сотрудник удалён. Почта: ${data.mailboxError || 'не удалена'}`, 'error');
        } else {
            showAlert('Сотрудник удалён', 'success');
        }
        await loadEmployees();
    } catch (err) {
        showAlert('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Удалить';
    }
}

async function logout() {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = '/frontend/admin/login.html';
}

function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

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

    document.getElementById('createMailbox').addEventListener('change', function() {
        const fields = document.getElementById('mailboxFields');
        fields.style.display = this.checked ? 'block' : 'none';
        if (this.checked) {
            document.getElementById('fmailLocal').dataset.manualEdit = 'false';
            autoFillMailLocal();
        }
    });

    document.getElementById('fname').addEventListener('input', autoFillMailLocal);
    document.getElementById('lname').addEventListener('input', autoFillMailLocal);
    document.getElementById('fmailLocal').addEventListener('input', function() { this.dataset.manualEdit = 'true'; });

    document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    document.getElementById('deleteOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeDelete(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDelete(); } });
});
