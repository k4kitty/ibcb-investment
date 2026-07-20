/**
 * IBCB Investment — Admin Panel Logic
 * Session-based auth with CSRF protection
 */

var API = window.location.origin;
var currentAdmin = null;
var csrfToken = '';
var currentPage = 1;
var currentLimit = 50;
var currentSearch = '';

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

/* ============================================================
   1. TOAST
   ============================================================ */
function showToast(msg, type) {
    type = type || 'success';
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(function () { t.className = 'toast'; }, 3500);
}

/* ============================================================
   2. API CLIENT (with CSRF)
   ============================================================ */
function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    headers['Content-Type'] = 'application/json';
    if (csrfToken && (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'DELETE')) {
        headers['X-CSRF-Token'] = csrfToken;
    }
    return fetch(API + path, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        credentials: 'same-origin'
    }).then(function (res) {
        if (!res.ok) {
            return res.json().catch(function () { return { error: '\u8acb\u6c42\u5931\u6557' }; })
            .then(function (err) { throw new Error(err.error || '\u8acb\u6c42\u5931\u6557'); });
        }
        return res.json();
    });
}

/* ============================================================
   3. AUTH
   ============================================================ */
function checkAuth() {
    api('/api/admin/status').then(function (data) {
        if (data.authenticated) {
            currentAdmin = data.admin;
            csrfToken = data.csrf || '';
            showAdmin();
        } else {
            showLogin();
        }
    }).catch(function () { showLogin(); });
}

function showLogin() {
    $('#loginPage').style.display = 'flex';
    $('#adminPage').style.display = 'none';
}

function showAdmin() {
    $('#loginPage').style.display = 'none';
    $('#adminPage').style.display = 'flex';
    initAdmin();
}

function initLogin() {
    $('#loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var username = $('#loginUser').value.trim();
        var password = $('#loginPass').value;
        api('/api/admin/login', { method: 'POST', body: { username: username, password: password } })
        .then(function (data) {
            currentAdmin = data.admin;
            csrfToken = data.csrf || '';
            showAdmin();
            showToast('\u767b\u5165\u6210\u529f');
        }).catch(function (err) {
            $('#loginError').textContent = err.message;
        });
    });
}

function initLogout() {
    $('#logoutBtn').addEventListener('click', function (e) {
        e.preventDefault();
        api('/api/admin/logout', { method: 'POST' }).then(function () {
            currentAdmin = null;
            csrfToken = '';
            showLogin();
            showToast('\u5df2\u767b\u51fa');
        });
    });
}

/* ============================================================
   4. ADMIN INIT
   ============================================================ */
function initAdmin() {
    updateTime();
    setInterval(updateTime, 60000);
    loadDashboard();

    var links = $$('.admin-nav a[data-page]');
    links.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            links.forEach(function (l) { l.classList.remove('active'); });
            link.classList.add('active');
            var page = link.getAttribute('data-page');
            $$('.admin-page').forEach(function (p) { p.classList.remove('active'); });
            var target = $('#page-' + page);
            if (target) target.classList.add('active');
            var titles = {
                dashboard: '\u6982\u89bd',
                members: '\u6703\u54e1\u7ba1\u7406',
                'events-manage': '\u6d3b\u52d5\u7ba1\u7406',
                'events-legacy': '\u6d3b\u52d5\u5831\u540d',
                'registrations': '\u5831\u540d\u8a18\u9304',
                lectures: '\u8b1b\u5ea7\u5831\u540d',
                news: '\u65b0\u805e\u767c\u5e03',
                contacts: '聯絡訊息',
                'mtl-teacher': 'MTL 學生進度'
            };
            $('#pageTitle').textContent = titles[page] || page;
            if (page === 'members') loadMembers();
            if (page === 'events-manage') loadEventsManage();
            if (page === 'events-legacy') loadEvents();
            if (page === 'registrations') loadRegistrations();
            if (page === 'lectures') loadLectures();
            if (page === 'news') loadNews();
            if (page === 'contacts') loadContacts();
            if (page === 'mtl-teacher') loadMTLTeacher();
        });
    });
}

function updateTime() {
    var el = $('#adminTime');
    if (el) el.textContent = new Date().toLocaleString('zh-HK');
}

/* ============================================================
   5. DASHBOARD
   ============================================================ */
function loadDashboard() {
    api('/api/admin/dashboard').then(function (data) {
        $('#statMembers').textContent = data.members.total || 0;
        $('#statToday').textContent = data.members.today || 0;
        $('#statEvents').textContent = data.events.total || 0;
        $('#statNews').textContent = data.news.total || 0;

        var tbody = $('#recentMembers');
        tbody.innerHTML = '';
        if (data.recentMembers && data.recentMembers.length) {
            data.recentMembers.forEach(function (m) {
                var row = '<tr>';
                row += '<td>' + escapeHtml(m.name) + '</td>';
                row += '<td>' + escapeHtml(m.email) + '</td>';
                row += '<td>' + escapeHtml(m.org || '-') + '</td>';
                row += '<td>' + formatDate(m.registeredAt) + '</td>';
                row += '</tr>';
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">\u66ab\u7121\u8cc7\u6599</td></tr>';
        }
    }).catch(function (err) {
        console.error('Dashboard error:', err);
    });
}

/* ============================================================
   6. MEMBERS
   ============================================================ */
function loadMembers(query) {
    query = query || '';
    currentSearch = query;
    var qs = '?limit=100';
    if (query) qs += '&search=' + encodeURIComponent(query);
    api('/api/members' + qs).then(function (data) {
        var tbody = $('#membersTable');
        tbody.innerHTML = '';
        if (data.members && data.members.length) {
            data.members.forEach(function (m) {
                var row = '<tr>';
                row += '<td>' + escapeHtml(m.name) + '</td>';
                row += '<td>' + escapeHtml(m.email) + '</td>';
                row += '<td>' + escapeHtml(m.phone || '-') + '</td>';
                row += '<td>' + escapeHtml(m.org || '-') + '</td>';
                row += '<td>' + escapeHtml(m.city || '-') + '</td>';
                row += '<td>' + escapeHtml(m.interest || '-') + '</td>';
                row += '<td>' + formatDate(m.registeredAt) + '</td>';
                row += '<td>';
                row += '<button class="btn btn-small btn-primary" data-action="edit-member" data-id="' + m.id + '">\u7de8\u8f2f</button> ';
                row += '<button class="btn btn-small btn-danger" data-action="delete-member" data-id="' + m.id + '">\u522a\u9664</button>';
                row += '</td></tr>';
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;">\u66ab\u7121\u6703\u54e1</td></tr>';
        }
    }).catch(function () {
        showToast('\u8f09\u5165\u6703\u54e1\u5931\u6557', 'error');
    });
}

/* ============================================================
   7. EVENTS
   ============================================================ */
function loadEvents(query) {
    query = query || '';
    var qs = '?limit=100';
    if (query) qs += '&search=' + encodeURIComponent(query);
    api('/api/events' + qs).then(function (data) {
        var tbody = $('#eventsTable');
        tbody.innerHTML = '';
        if (data.submissions && data.submissions.length) {
            data.submissions.forEach(function (s) {
                var row = '<tr>';
                row += '<td>' + escapeHtml(s.name) + '</td>';
                row += '<td>' + escapeHtml(s.email) + '</td>';
                row += '<td>' + escapeHtml(s.org || '-') + '</td>';
                row += '<td>' + escapeHtml(s.date) + '</td>';
                row += '<td>' + escapeHtml(s.slot) + '</td>';
                row += '<td>' + escapeHtml(s.interest || '-') + '</td>';
                row += '<td>' + formatDate(s.submittedAt) + '</td>';
                row += '<td><button class="btn btn-small btn-danger" data-action="delete-event" data-id="' + s.id + '">\u522a\u9664</button></td>';
                row += '</tr>';
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;">\u66ab\u7121\u5831\u540d</td></tr>';
        }
    }).catch(function () {
        showToast('\u8f09\u5165\u6d3b\u52d5\u5931\u6557', 'error');
    });
}

/* ============================================================
   7b. EVENTS MANAGE (活動管理 CRUD)
   ============================================================ */
function loadEventsManage() {
    api('/api/events/manage').then(function (data) {
        var tbody = $('#eventsManageTable');
        tbody.innerHTML = '';
        if (data.events && data.events.length) {
            data.events.forEach(function (ev) {
                var statusLabel = ev.status === 'active' ? '\u9032\u884c\u4e2d' : '\u5df2\u7d50\u675f';
                var row = '<tr>';
                row += '<td>' + escapeHtml(ev.title) + '</td>';
                row += '<td>' + escapeHtml(ev.event_date) + (ev.event_end_date ? ' ~ ' + escapeHtml(ev.event_end_date) : '') + '</td>';
                row += '<td>' + escapeHtml(ev.event_time || '-') + '</td>';
                row += '<td>' + escapeHtml(ev.location || '-') + '</td>';
                row += '<td>' + statusLabel + '</td>';
                row += '<td>';
                row += '<button class="btn btn-small btn-primary" data-action="edit-event-manage" data-id="' + ev.id + '">編輯</button> <button class="btn btn-small notify-btn" data-action="notify-event" data-id="' + ev.id + '">通知會員</button> <button class="btn btn-small btn-danger" data-action="delete-event-manage" data-id="' + ev.id + '">刪除</button>';
                row += '</td></tr>';
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;">\u66ab\u7121\u6d3b\u52d5</td></tr>';
        }
    }).catch(function () {
        showToast('\u8f09\u5165\u6d3b\u52d5\u5931\u6557', 'error');
    });
}

function saveEvent() {
    var id = $('#ev_id').value;
    var body = {
        title: $('#ev_title').value.trim(),
        event_date: $('#ev_date').value,
        event_end_date: $('#ev_end_date').value,
        event_time: $('#ev_time').value.trim(),
        location: $('#ev_location').value.trim(),
        description: $('#ev_description').value.trim(),
        content: $('#ev_content').value.trim(),
        status: $('#ev_status').value,
        max_attendees: parseInt($('#ev_max_attendees').value) || 0
    };
    if (!body.title || !body.event_date) {
        return showToast('\u8acb\u586b\u5beb\u6d3b\u52d5\u6a19\u984c\u548c\u65e5\u671f', 'error');
    }
    var method = id ? 'PUT' : 'POST';
    var url = id ? '/api/events/manage/' + id : '/api/events/manage';
    api(url, { method: method, body: body }).then(function () {
        showToast(id ? '\u6d3b\u52d5\u5df2\u66f4\u65b0' : '\u6d3b\u52d5\u5df2\u65b0\u589e');
        resetEventForm();
        loadEventsManage();
        loadDashboard();
    }).catch(function (err) { showToast(err.message, 'error'); });
}

function notifyMembers(eventId) {
    var choice = confirm("\u9078\u64c7\u300c\u78ba\u5b9a\u300d\u767c\u9001\u7d66\u6240\u6709\u6703\u54e1\uff0c\u6216\u300c\u53d6\u6d88\u300d\u5f8c\u6307\u5b9a\u8208\u8da3\u5206\u985e");
    var target = choice ? "all" : "interest";
    var interest = "";
    if (!choice) {
        interest = prompt("\u8acb\u8f38\u5165\u8208\u8da3\u5206\u985e\uff08\u5982\uff1aAI\u3001edtech\u3001curriculum\uff09\uff1a");
        if (!interest) return;
    }
    showToast("\u6b63\u5728\u767c\u9001\u901a\u77e5...");
    api("/api/events/manage/" + eventId + "/notify", {
        method: "POST",
        body: { target: target, interest: interest }
    }).then(function (data) {
        showToast("\u5df2\u767c\u9001\u901a\u77e5\u7d66 " + data.sent + " \u4f4d\u6703\u54e1");
    }).catch(function (err) { showToast(err.message, "error"); });
}

function resetEventForm() {
    $('#eventManageForm').reset();
    $('#ev_id').value = '';
    $('#eventFormTitle').textContent = '\u65b0\u589e\u6d3b\u52d5';
    $('#evSubmitBtn').textContent = '\u65b0\u589e\u6d3b\u52d5';
    $('#evCancelBtn').style.display = 'none';
    $('#ev_status').value = 'active';
    $('#ev_max_attendees').value = '0';
}

function editEventManage(id) {
    api('/api/events/manage/' + id).then(function (ev) {
        $('#ev_id').value = ev.id;
        $('#ev_title').value = ev.title || '';
        $('#ev_date').value = ev.event_date || '';
        $('#ev_end_date').value = ev.event_end_date || '';
        $('#ev_time').value = ev.event_time || '';
        $('#ev_location').value = ev.location || '';
        $('#ev_description').value = ev.description || '';
        $('#ev_content').value = ev.content || '';
        $('#ev_status').value = ev.status || 'active';
        $('#ev_max_attendees').value = ev.max_attendees || 0;
        $('#eventFormTitle').textContent = '\u7de8\u8f2f\u6d3b\u52d5';
        $('#evSubmitBtn').textContent = '\u66f4\u65b0\u6d3b\u52d5';
        $('#evCancelBtn').style.display = 'inline-block';
        $('#page-events-manage').scrollIntoView({ behavior: 'smooth' });
    }).catch(function () { showToast('\u8f09\u5165\u6d3b\u52d5\u5931\u6557', 'error'); });
}

function initEventManageForm() {
    $('#eventManageForm').addEventListener('submit', function (e) {
        e.preventDefault();
        saveEvent();
    });
    $('#evCancelBtn').addEventListener('click', resetEventForm);
}

/* ============================================================
   7c. REGISTRATIONS (報名記錄)
   ============================================================ */
function loadRegistrations() {
    api('/api/event-registrations').then(function (data) {
        var tbody = $('#registrationsTable');
        tbody.innerHTML = '';
        if (data.registrations && data.registrations.length) {
            data.registrations.forEach(function (r) {
                var row = '<tr>';
                row += '<td>' + escapeHtml(r.event_title || '-') + '</td>';
                row += '<td>' + escapeHtml(r.name) + '</td>';
                row += '<td>' + escapeHtml(r.email) + '</td>';
                row += '<td>' + escapeHtml(r.org || '-') + '</td>';
                row += '<td>' + escapeHtml(r.phone || '-') + '</td>';
                row += '<td>' + formatDate(r.submittedAt) + '</td>';
                row += '<td><button class="btn btn-small btn-danger" data-action="delete-registration" data-id="' + r.id + '">\u522a\u9664</button></td>';
                row += '</tr>';
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">\u66ab\u7121\u5831\u540d\u8a18\u9304</td></tr>';
        }
    }).catch(function () { showToast('\u8f09\u5165\u5831\u540d\u8a18\u9304\u5931\u6557', 'error'); });
}

/* ============================================================
   8. LECTURES
   ============================================================ */
function loadLectures(query) {
    query = query || '';
    var qs = '?limit=100';
    if (query) qs += '&search=' + encodeURIComponent(query);
    api('/api/lectures' + qs).then(function (data) {
        var tbody = $('#lecturesTable');
        tbody.innerHTML = '';
        if (data.lectures && data.lectures.length) {
            data.lectures.forEach(function (l) {
                var row = '<tr>';
                row += '<td>' + escapeHtml(l.name) + '</td>';
                row += '<td>' + escapeHtml(l.email) + '</td>';
                row += '<td>' + escapeHtml(l.org || '-') + '</td>';
                row += '<td>' + escapeHtml(l.date || '-') + '</td>';
                row += '<td>' + escapeHtml(l.topic || '-') + '</td>';
                row += '<td>' + formatDate(l.submittedAt) + '</td>';
                row += '<td><button class="btn btn-small btn-danger" data-action="delete-lecture" data-id="' + l.id + '">\u522a\u9664</button></td>';
                row += '</tr>';
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">\u66ab\u7121\u5831\u540d</td></tr>';
        }
    }).catch(function () {
        showToast('\u8f09\u5165\u8b1b\u5ea7\u5931\u6557', 'error');
    });
}

/* ============================================================
   9. NEWS
   ============================================================ */
function loadNews() {
    api('/api/news').then(function (data) {
        var tbody = $('#newsTable');
        tbody.innerHTML = '';
        if (data.news && data.news.length) {
            data.news.forEach(function (n) {
                var row = '<tr>';
                row += '<td>' + escapeHtml(n.date) + '</td>';
                row += '<td>' + escapeHtml(n.title) + '</td>';
                row += '<td>';
                row += '<button class="btn btn-small btn-primary" data-action="edit-news" data-id="' + n.id + '">\u7de8\u8f2f</button> ';
                row += '<button class="btn btn-small btn-danger" data-action="delete-news" data-id="' + n.id + '">\u522a\u9664</button>';
                row += '</td></tr>';
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;">\u66ab\u7121\u6587\u7ae0</td></tr>';
        }
    }).catch(function () {
        showToast('\u8f09\u5165\u65b0\u805e\u5931\u6557', 'error');
    });
}

function initNewsForm() {
    $('#newsForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var title = $('#newsTitle').value.trim();
        var date = $('#newsDate').value;
        var content = $('#newsContent').value.trim();
        var editId = $('#newsEditId').value;
        if (!title || !date) return showToast('\u8acb\u586b\u5beb\u6a19\u984c\u548c\u65e5\u671f', 'error');

        var method = editId ? 'PUT' : 'POST';
        var url = editId ? '/api/news/' + editId : '/api/news';
        var body = { title: title, content: content, date: date };

        api(url, { method: method, body: body }).then(function () {
            showToast(editId ? '\u6587\u7ae0\u5df2\u66f4\u65b0' : '\u6587\u7ae0\u5df2\u767c\u5e03');
            $('#newsForm').reset();
            $('#newsEditId').value = '';
            $('#newsSubmitBtn').textContent = '\u767c\u5e03';
            loadNews();
            loadDashboard();
        }).catch(function (err) {
            showToast(err.message || '\u5132\u5b58\u5931\u6557', 'error');
        });
    });
}

function editNews(id) {
    api('/api/news').then(function (data) {
        var newsList = data.news || [];
        var found = null;
        for (var i = 0; i < newsList.length; i++) {
            if (newsList[i].id === id) { found = newsList[i]; break; }
        }
        if (!found) return showToast('\u627e\u4e0d\u5230\u8a72\u6587\u7ae0', 'error');

        $('#newsTitle').value = found.title || '';
        $('#newsDate').value = found.date || '';
        $('#newsContent').value = found.content || '';
        $('#newsEditId').value = found.id;
        $('#newsSubmitBtn').textContent = '\u66f4\u65b0';
        // Scroll to form
        $('#newsForm').scrollIntoView({ behavior: 'smooth' });
    });
}

/* ============================================================
   10. CONTACTS
   ============================================================ */
function loadContacts(filter) {
    var qs = '?limit=100';
    if (filter === 'unread') qs += '&unread=1';
    api('/api/contact' + qs).then(function (data) {
        var tbody = $('#contactsTable');
        tbody.innerHTML = '';
        if (data.messages && data.messages.length) {
            data.messages.forEach(function (msg) {
                var unreadClass = msg.read ? '' : ' style="font-weight:600;background:#fffdf5"';
                var row = '<tr' + unreadClass + '>';
                row += '<td>' + escapeHtml(msg.name) + '</td>';
                row += '<td>' + escapeHtml(msg.email) + '</td>';
                row += '<td>' + escapeHtml(msg.subject) + '</td>';
                row += '<td>' + formatDate(msg.submittedAt) + '</td>';
                row += '<td>';
                row += '<button class="btn btn-small btn-primary" data-action="view-contact" data-id="' + msg.id + '">\u67e5\u770b</button> ';
                row += '<button class="btn btn-small btn-danger" data-action="delete-contact" data-id="' + msg.id + '">\u522a\u9664</button>';
                row += '</td></tr>';
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;">\u66ab\u7121\u8a0a\u606f</td></tr>';
        }
    }).catch(function () {
        showToast('\u8f09\u5165\u8a0a\u606f\u5931\u6557', 'error');
    });
}

/* ============================================================
   11. DELEGATED CLICK HANDLERS
   ============================================================ */
document.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');

    switch (action) {
        case 'edit-member':
            openMemberModal(id);
            break;
        case 'delete-member':
            if (!confirm('\u78ba\u5b9a\u522a\u9664\u6b64\u6703\u54e1\uff1f')) return;
            api('/api/members/' + id, { method: 'DELETE' }).then(function () {
                showToast('\u5df2\u522a\u9664');
                loadMembers(currentSearch);
                loadDashboard();
            }).catch(function (err) { showToast(err.message, 'error'); });
            break;
        case 'delete-event':
            if (!confirm('\u78ba\u5b9a\u522a\u9664\u6b64\u5831\u540d\uff1f')) return;
            api('/api/events/' + id, { method: 'DELETE' }).then(function () {
                showToast('\u5df2\u522a\u9664');
                loadEvents();
                loadDashboard();
            }).catch(function (err) { showToast(err.message, 'error'); });
            break;
        case 'delete-lecture':
            if (!confirm('\u78ba\u5b9a\u522a\u9664\u6b64\u5831\u540d\uff1f')) return;
            api('/api/lectures/' + id, { method: 'DELETE' }).then(function () {
                showToast('\u5df2\u522a\u9664');
                loadLectures();
                loadDashboard();
            }).catch(function (err) { showToast(err.message, 'error'); });
            break;
        case 'delete-news':
            if (!confirm('\u78ba\u5b9a\u522a\u9664\u6b64\u6587\u7ae0\uff1f')) return;
            api('/api/news/' + id, { method: 'DELETE' }).then(function () {
                showToast('\u5df2\u522a\u9664');
                loadNews();
                loadDashboard();
            }).catch(function (err) { showToast(err.message, 'error'); });
            break;
        case 'edit-news':
            editNews(id);
            break;
        case 'view-contact':
            viewContact(id);
            break;
        case 'delete-contact':
            if (!confirm('\u78ba\u5b9a\u522a\u9664\u6b64\u8a0a\u606f\uff1f')) return;
            api('/api/contact/' + id, { method: 'DELETE' }).then(function () {
                showToast('\u5df2\u522a\u9664');
                loadContacts();
                loadDashboard();
            }).catch(function (err) { showToast(err.message, 'error'); });
            break;
        case 'edit-event-manage':
            editEventManage(id);
            break;
        case 'notify-event':
            notifyMembers(id);
            break;

            break;
        case 'delete-event-manage':
            if (!confirm('\u78ba\u5b9a\u522a\u9664\u6b64\u6d3b\u52d5\uff1f')) return;
            api('/api/events/manage/' + id, { method: 'DELETE' }).then(function () {
                showToast('\u5df2\u522a\u9664');
                loadEventsManage();
                loadDashboard();
            }).catch(function (err) { showToast(err.message, 'error'); });
            break;
        case 'delete-registration':
            if (!confirm('\u78ba\u5b9a\u522a\u9664\u6b64\u5831\u540d\uff1f')) return;
            api('/api/event-registrations/' + id, { method: 'DELETE' }).then(function () {
                showToast('\u5df2\u522a\u9664');
                loadRegistrations();
                loadDashboard();
            }).catch(function (err) { showToast(err.message, 'error'); });
            break;
    }
});

/* ============================================================
   12. CONTACT VIEW MODAL
   ============================================================ */
function viewContact(id) {
    api('/api/contact?limit=100').then(function (data) {
        var msgs = data.messages || [];
        var msg = null;
        for (var i = 0; i < msgs.length; i++) {
            if (msgs[i].id === id) { msg = msgs[i]; break; }
        }
        if (!msg) return showToast('\u627e\u4e0d\u5230\u8a0a\u606f', 'error');

        // Mark as read
        api('/api/contact/' + id + '/read', { method: 'PUT' }).catch(function () {});

        var content = '';
        content += '\u5bc4\u4ef6\u4eba: ' + escapeHtml(msg.name) + '\n';
        content += '\u96fb\u90f5: ' + escapeHtml(msg.email) + '\n';
        if (msg.org) content += '\u6a5f\u69cb: ' + escapeHtml(msg.org) + '\n';
        if (msg.phone) content += '\u96fb\u8a71: ' + escapeHtml(msg.phone) + '\n';
        content += '\u4e3b\u984c: ' + escapeHtml(msg.subject) + '\n';
        content += '\u6642\u9593: ' + formatDate(msg.submittedAt) + '\n';
        content += '\n---\n\n' + escapeHtml(msg.message);

        alert(content);
    });
}

/* ============================================================
   13. MEMBER MODAL
   ============================================================ */
function openMemberModal(id) {
    var modal = $('#memberModal');
    var title = $('#memberModalTitle');
    $('#memberForm').reset();
    $('#m_id').value = '';

    if (id) {
        title.textContent = '\u7de8\u8f2f\u6703\u54e1';
        api('/api/members/' + id).then(function (m) {
            $('#m_id').value = m.id;
            $('#m_name').value = m.name || '';
            $('#m_email').value = m.email || '';
            $('#m_org').value = m.org || '';
            $('#m_title').value = m.title || '';
            // Country/city select cascade
            var countryVal = m.country || '';
            // Map legacy "香港" country to 中國 + city 香港
            if (countryVal === '香港') {
                countryVal = '中國';
                m.city = '香港';
            }
            if (countryVal === '中國' || countryVal === '其他') {
                $('#m_country').value = countryVal;
            } else if (countryVal) {
                $('#m_country').value = '其他';
                $('#m_country_other').value = countryVal;
                $('#m_country_other').style.display = '';
            }
            // Show appropriate city field and set value
            $('#m_country').dispatchEvent(new Event('change'));
            // After dispatch: if China selected, check if city matches dropdown option
            if (countryVal === '中國') {
                var cityVal = m.city || '';
                var cnOpts = $('#m_city_cn').querySelectorAll('option');
                var found = false;
                for (var ci = 0; ci < cnOpts.length; ci++) {
                    if (cnOpts[ci].value === cityVal && cnOpts[ci].value !== '') { found = true; break; }
                }
                if (found) {
                    $('#m_city_cn').value = cityVal;
                } else if (cityVal) {
                    $('#m_city_cn').value = '其他';
                    $('#m_city_other').value = cityVal;
                }
            } else {
                $('#m_city_other').value = m.city || '';
            }
            var interestKnown = ["ai_tech","ai_plus","ai_education","robotics","finance","curriculum","活動","partnership","other"];
            if (m.interest && interestKnown.indexOf(m.interest) >= 0) {
                $('#m_interest').value = m.interest;
            } else if (m.interest) {
                $('#m_interest').value = 'other';
                $('#m_interest_other').value = m.interest;
                $('#m_interest_other').style.display = '';
            }
            if (m.phone) $('#m_phone').value = m.phone;
            if (m.wechat) $('#m_wechat').value = m.wechat;
            modal.style.display = 'flex';
        }).catch(function () { showToast('\u8f09\u5165\u6703\u54e1\u5931\u6557', 'error'); });
    } else {
        title.textContent = '\u65b0\u589e\u6703\u54e1';
        modal.style.display = 'flex';
    }
}

function saveMember() {
    var id = $('#m_id').value;
    // Resolve country and city from cascade selects
    var countrySel = $('#m_country').value;
    var countryVal = countrySel === '其他' ? $('#m_country_other').value.trim() : countrySel;
    var cityVal;
    if (countrySel === '中國') {
        cityVal = $('#m_city_cn').value === '其他' ? $('#m_city_other').value.trim() : $('#m_city_cn').value;
    } else {
        cityVal = $('#m_city_other').value.trim();
    }
    var body = {
        name: $('#m_name').value.trim(),
        email: $('#m_email').value.trim(),
        org: $('#m_org').value.trim(),
        title: $('#m_title').value.trim(),
        country: countryVal,
        city: cityVal,
        phone: ($('#m_phone') ? $('#m_phone').value.trim() : ''),
        wechat: ($('#m_wechat') ? $('#m_wechat').value.trim() : ''),
        interest: $('#m_interest').value === 'other' ? ($('#m_interest_other').value.trim() || 'other') : $('#m_interest').value,
    };
    if (!body.name || !body.email || !body.country || !body.city) {
        return showToast('\u8acb\u586b\u5beb\u5fc5\u586b\u6b04\u4f4d', 'error');
    }

    var method = id ? 'PUT' : 'POST';
    var url = id ? '/api/members/' + id : '/api/members';
    api(url, { method: method, body: body }).then(function () {
        showToast(id ? '\u6703\u54e1\u8cc7\u6599\u5df2\u66f4\u65b0' : '\u6703\u54e1\u5df2\u65b0\u589e');
        $('#memberModal').style.display = 'none';
        loadMembers(currentSearch);
        loadDashboard();
    }).catch(function (err) { showToast(err.message, 'error'); });
}

function initMemberCRUD() {
    var modal = $('#memberModal');
    var form = $('#memberForm');
    $('#addMemberBtn').addEventListener('click', function () { openMemberModal(null); });
    $('#cancelMember').addEventListener('click', function () { modal.style.display = 'none'; });
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        saveMember();
    });
    // Close modal on backdrop click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.style.display = 'none';
    });
}

/* ============================================================
   14. SEARCH
   ============================================================ */
function initSearch() {
    var memberSearch = $('#memberSearch');
    if (memberSearch) {
        memberSearch.addEventListener('input', function () { loadMembers(this.value); });
    }
    var eventSearch = $('#eventSearch');
    if (eventSearch) {
        eventSearch.addEventListener('input', function () { loadEvents(this.value); });
    }
    var lectureSearch = $('#lectureSearch');
    if (lectureSearch) {
        lectureSearch.addEventListener('input', function () { loadLectures(this.value); });
    }
    var contactFilter = $('#contactFilter');
    if (contactFilter) {
        contactFilter.addEventListener('change', function () { loadContacts(this.value); });
    }
}

/* ============================================================
   15. EXPORT
   ============================================================ */
function initExport() {
    var exportMembers = $('#exportMembers');
    if (exportMembers) {
        exportMembers.addEventListener('click', function () {
            window.open(API + '/api/export/members.csv', '_blank');
        });
    }
    var exportEvents = $('#exportEvents');
    if (exportEvents) {
        exportEvents.addEventListener('click', function () {
            window.open(API + '/api/export/events.csv', '_blank');
        });
    }
    var exportLectures = $('#exportLectures');
    if (exportLectures) {
        exportLectures.addEventListener('click', function () {
            window.open(API + '/api/export/lectures.csv', '_blank');
        });
    }
}

/* ============================================================
   16. HELPERS
   ============================================================ */
function escapeHtml(str) {
    if (!str) return '-';
    return String(str).replace(/[<>\"'&]/g, function (c) {
        return {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'}[c];
    });
}

function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('zh-HK');
}

/* ============================================================
   17. MTL TEACHER DASHBOARD
   ============================================================ */
function loadMTLTeacher() {
    api('/api/mtl/teacher/students').then(function(data) {
        var tbody = $('#mtlTeacherTable');
        if (!data.students || data.students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#888;padding:24px;">尚無學生記錄</td></tr>';
            return;
        }
        tbody.innerHTML = data.students.map(function(s) {
            var levelsDone = Math.floor((s.games_done || 0) / 20);
            return '<tr>' +
                '<td><strong>' + escapeHtml(s.name) + '</strong></td>' +
                '<td><code style="background:#f5f5f5;padding:2px 8px;border-radius:4px;">' + escapeHtml(s.save_code) + '</code></td>' +
                '<td>' + s.games_done + ' / 240</td>' +
                '<td>' + s.trophies + '</td>' +
                '<td>' + s.total_stars + ' ⭐</td>' +
                '<td>' + (s.skill_stars || 0) + ' ⭐</td>' +
                '<td>' + formatDate(s.last_active) + '</td>' +
                '<td><button class="btn" onclick="viewMTLStudent(\'' + s.id + '\')">查看進度</button></td>' +
                '</tr>';
        }).join('');
    }).catch(function(e) {
        console.error('MTL teacher load:', e);
        $('#mtlTeacherTable').innerHTML = '<tr><td colspan="9" style="text-align:center;color:#c0392b;padding:24px;">載入失敗</td></tr>';
    });
}

function viewMTLStudent(studentId) {
    api('/api/mtl/teacher/progress/' + studentId).then(function(data) {
        var rows = '';
        for (var i = 1; i <= 12; i++) {
            var key = 'level_' + i;
            var l = data.levels[key];
            var pct = Math.round((l.gamesDone / 20) * 100);
            var badge = l.completed ? '🏆' : (l.gamesDone > 0 ? '🟡' : '⚪');
            rows += '<tr><td>' + badge + '</td><td>Grade ' + i + '</td><td>' + l.gamesDone + '/20</td><td style="width:200px"><div style="background:#eee;height:6px;border-radius:3px;"><div style="background:#2d8a4e;height:6px;border-radius:3px;width:' + pct + '%;"></div></div></td><td>' + pct + '%</td></tr>';
        }
        showMTLDetailModal(data.student.name, data.student.save_code, rows);
    }).catch(function(e) {
        alert('載入失敗：' + e.message);
    });
}

function showMTLDetailModal(name, saveCode, rows) {
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;">' +
        '<h3 style="margin:0 0 4px;">' + escapeHtml(name) + '</h3>' +
        '<p style="color:#888;margin:0 0 20px;">Save Code: <strong>' + escapeHtml(saveCode) + '</strong></p>' +
        '<table style="width:100%;border-collapse:collapse;"><thead><tr><th></th><th>級別</th><th>進度</th><th></th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<button style="margin-top:20px;padding:10px 24px;background:#2c3e50;color:#fff;border:none;border-radius:8px;cursor:pointer;" onclick="this.closest(\'div[style]\').parentElement.remove()">關閉</button>' +
        '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

/* ============================================================
   18. BOOTSTRAP
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    initLogin();
    initLogout();
    initNewsForm();
    initSearch();
    initExport();
    initMemberCRUD();
    initEventManageForm();
    checkAuth();
});
