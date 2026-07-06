/**
 * IBCB Investment — Frontend Application Logic
 * Handles: forms, validation, nav, animations, link normalization
 */

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
   2. SANITIZATION & VALIDATION
   ============================================================ */
function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>\"'&]/g, '').trim();
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    if (!phone) return true;
    return /^[\d\s\-+()]{6,20}$/.test(phone);
}

/* ============================================================
   3. MOBILE NAVIGATION
   ============================================================ */
function initMobileNav() {
    var toggle = $('#mobileNavToggle');
    var nav = $('#mainNav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
        var isOpen = nav.classList.toggle('open');
        toggle.textContent = isOpen ? '✕' : '☰';
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    var links = nav.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function () {
            nav.classList.remove('open');
            toggle.textContent = '☰';
            document.body.style.overflow = '';
        });
    }
    document.addEventListener('click', function (e) {
        if (nav.classList.contains('open') &&
            !nav.contains(e.target) &&
            e.target !== toggle) {
            nav.classList.remove('open');
            toggle.textContent = '☰';
            document.body.style.overflow = '';
        }
    });
}

/* ============================================================
   4. SCROLL ANIMATIONS
   ============================================================ */
function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    var targets = document.querySelectorAll('.fade-in, .fade-in-up, .stagger-children');
    for (var i = 0; i < targets.length; i++) {
        observer.observe(targets[i]);
    }
}

/* ============================================================
   5. REAL-TIME FORM VALIDATION
   ============================================================ */
function initFormValidation() {
    var inputs = document.querySelectorAll('input[required], select[required]');
    for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('input', function () { validateField(this); });
        inputs[i].addEventListener('change', function () {
            this.classList.remove('error');
            var err = $('#' + this.id + 'Error');
            if (err) err.textContent = '';
        });
    }
}

function showFieldError(el, msg) {
    if (!el) return;
    el.classList.add('error');
    var errId = el.id + 'Error';
    var errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = msg;
}

function validateField(el) {
    var value = el.value.trim();
    var message = '';
    if (el.hasAttribute('required') && !value) {
        message = '請填寫' + getFieldLabel(el.id);
    } else if (el.type === 'email' && value && !validateEmail(value)) {
        message = '請填寫有效電郵';
    } else if (el.type === 'tel' && value && !validatePhone(value)) {
        message = '請填寫有效電話';
    }
    if (message) {
        el.classList.add('error');
        var errEl = $('#' + el.id + 'Error');
        if (errEl) errEl.textContent = message;
        return false;
    } else {
        if (value) el.classList.add('valid');
        else el.classList.remove('valid');
        var errEl = $('#' + el.id + 'Error');
        if (errEl) errEl.textContent = '';
        return true;
    }
}

function getFieldLabel(id) {
    var map = {
        'r_name': '姓名', 'r_email': '電郵',
        'r_country': '國家/地區', 'r_city': '城市',
        'w_name': '姓名', 'w_email': '電郵',
        'w_date': '參加日期', 'w_slot': '時段',
        'c_subject': '主題', 'c_message': '內容'
    };
    return map[id] || '此欄位';
}

/* ============================================================
   6. EVENT FORM (活動預約)
   ============================================================ */
function getTimeSlots() {
    var slots = [];
    for (var h = 10; h <= 16; h++) {
        if (h === 12) continue;
        var start = String(h).padStart(2, '0') + ':00';
        var end = String(h + 1).padStart(2, '0') + ':00';
        slots.push({ value: start + '-' + end, label: start + ' – ' + end });
    }
    return slots;
}

function populateSlots(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="">請選擇</option>';
    var slots = getTimeSlots();
    for (var i = 0; i < slots.length; i++) {
        var opt = document.createElement('option');
        opt.value = slots[i].value;
        opt.textContent = slots[i].label;
        selectEl.appendChild(opt);
    }
}

function initEventForm() {
    var form = $('#eventForm');
    var dateInput = $('#w_date');
    var slotSelect = $('#w_slot');
    if (!form) return;
    populateSlots(slotSelect);
    if (dateInput) {
        var today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        dateInput.value = today;
    }
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var valid = true;
        var reqFields = ['w_name', 'w_email', 'w_date', 'w_slot'];
        for (var i = 0; i < reqFields.length; i++) {
            var el = $('#' + reqFields[i]);
            if (el && !validateField(el)) valid = false;
        }
        if (!valid) return;
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '提交中...'; }
        var entry = {
            name: $('#w_name').value.trim(),
            org: sanitize($('#w_org').value),
            email: $('#w_email').value.trim().toLowerCase(),
            phone: sanitize($('#w_phone').value),
            wechat: sanitize($('#w_wechat').value),
            date: $('#w_date').value,
            slot: $('#w_slot').value,
            interest: sanitize($('#w_interest').value),
            agreed: $('#w_agree').checked
        };
        fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        })
        .then(function (r) {
            return r.json().then(function (d) {
                if (!r.ok) throw new Error(d.error || '儲存失敗');
                return d;
            });
        })
        .then(function () {
            showToast('預約成功！確認通知將發送至您的電郵。');
            form.reset();
            if (dateInput) {
                var t = new Date().toISOString().split('T')[0];
                dateInput.setAttribute('min', t);
                dateInput.value = t;
            }
            populateSlots(slotSelect);
        })
        .catch(function (err) { showToast(err.message, 'error'); })
        .finally(function () {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '確認預約'; }
        });
    });
}

/* ============================================================
   7. REGISTER FORM (會員登記)
   ============================================================ */
function initRegisterForm() {
    var form = $('#registerForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var valid = true;

        // Basic required fields
        var reqFields = ['r_name', 'r_email'];
        for (var i = 0; i < reqFields.length; i++) {
            var el = $('#' + reqFields[i]);
            if (el && !validateField(el)) valid = false;
        }

        // Validate country: select or other input
        var countrySelect = $('#r_country');
        var country = countrySelect.value;
        if (!country) { valid = false; showFieldError(countrySelect, '請選擇國家/地區'); }
        else if (country === '其他') {
            country = $('#r_country_other').value.trim();
            if (!country) { valid = false; showFieldError($('#r_country_other'), '請輸入國家/地區'); }
        }

        // Validate city based on country
        var city;
        if (countrySelect.value === '中國') {
            city = $('#r_city_cn').value;
            if (city === '其他') {
                city = $('#r_city_other').value.trim();
                if (!city) { valid = false; showFieldError($('#r_city_other'), '請輸入城市'); }
            } else if (!city) {
                valid = false; showFieldError($('#r_city_cn'), '請選擇城市');
            }
        } else {
            city = $('#r_city_other').value.trim();
            if (!city) { valid = false; showFieldError($('#r_city_other'), '請輸入城市'); }
        }

        if (!valid) return;

        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '提交中...'; }

        var payload = {
            name: $('#r_name').value.trim(),
            email: $('#r_email').value.trim().toLowerCase(),
            org: sanitize($('#r_org').value),
            title: sanitize($('#r_title').value),
            role: sanitize($('#r_role').value),
            phone: sanitize($('#r_phone').value),
            wechat: sanitize($('#r_wechat').value),
            country: country,
            city: city,
            interest: sanitize($('#r_interest').value),
            agreed: $('#r_agree').checked
        };

        // Resolve "其他" interest
        if (payload.interest === 'other') {
            payload.interest = sanitize($('#r_interest_other').value) || 'other';
        }

        fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function (r) {
            return r.json().then(function (d) {
                if (!r.ok) throw new Error(d.error || '儲存失敗');
                return d;
            });
        })
        .then(function () {
            showToast('會員登記成功！');
            setTimeout(function () { window.location.href = 'index.html'; }, 1500);
        })
        .catch(function (err) { showToast(err.message || '儲存失敗', 'error'); })
        .finally(function () {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '提交登記'; }
        });
    });
}

/* ============================================================
   8. LECTURE FORM (講座報名)
   ============================================================ */
function initLectureForm() {
    var form = $('#lectureForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var valid = true;
        var reqFields = ['l_name', 'l_email', 'l_country', 'l_city'];
        for (var i = 0; i < reqFields.length; i++) {
            var el = $('#' + reqFields[i]);
            if (el && !validateField(el)) valid = false;
        }
        if (!valid) return;
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '提交中...'; }
        var payload = {
            name: $('#l_name').value.trim(),
            email: $('#l_email').value.trim().toLowerCase(),
            org: sanitize($('#l_org').value),
            title: sanitize($('#l_title').value),
            role: sanitize($('#l_role').value),
            phone: sanitize($('#l_phone').value),
            wechat: sanitize($('#l_wechat').value),
            country: $('#l_country').value.trim(),
            city: $('#l_city').value.trim(),
            date: $('#l_date').value,
            topic: sanitize($('#l_topic').value),
            agreed: $('#l_agree').checked
        };
        fetch('/api/lectures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function (r) {
            return r.json().then(function (d) {
                if (!r.ok) throw new Error(d.error || '儲存失敗');
                return d;
            });
        })
        .then(function () {
            showToast('報名成功！確認通知將發送至您的電郵。');
            form.reset();
        })
        .catch(function (err) { showToast(err.message, 'error'); })
        .finally(function () {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '提交報名'; }
        });
    });
}

/* ============================================================
   9. CONTACT FORM
   ============================================================ */
function initContactForm() {
    var form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var valid = true;
        var reqFields = ['c_name', 'c_email', 'c_subject', 'c_message'];
        for (var i = 0; i < reqFields.length; i++) {
            var el = $('#' + reqFields[i]);
            if (el && !validateField(el)) valid = false;
        }
        if (!valid) return;
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '發送中...'; }
        var payload = {
            name: $('#c_name').value.trim(),
            email: $('#c_email').value.trim().toLowerCase(),
            org: sanitize($('#c_org').value),
            phone: sanitize($('#c_phone').value),
            subject: $('#c_subject').value.trim(),
            message: $('#c_message').value.trim()
        };
        fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function (r) {
            return r.json().then(function (d) {
                if (!r.ok) throw new Error(d.error || '發送失敗');
                return d;
            });
        })
        .then(function () {
            showToast('訊息已發送！我們將盡快回覆。');
            form.reset();
        })
        .catch(function (err) { showToast(err.message, 'error'); })
        .finally(function () {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '發送訊息'; }
        });
    });
}

/* ============================================================
   10. LINK NORMALIZATION
   ============================================================ */
function normalizeLinks() {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href');
        if (!href) continue;
        if (href.indexOf('http') === 0 || href.indexOf('mailto') === 0 ||
            href.indexOf('//') === 0 || href.indexOf('#') === 0) continue;
        if (href.indexOf('.') !== -1 && href.indexOf('.html') === -1) continue;
        if (href.slice(-5) === '.html') continue;
        links[i].setAttribute('href', href + '.html');
    }
}

/* ============================================================
   11. SOFT REDIRECT
   ============================================================ */
function softRedirect() {
    var p = location.pathname.replace(/\/+$/, '');
    var map = { '': 'index.html', '/index': 'index.html', '/about': 'about.html',
        '/register': 'register.html', '/lectures': 'lectures.html',
        '/events': 'events.html', '/news': 'news.html',
        '/contact': 'contact.html', '/admin': 'admin.html' };
    var target = map[p];
    if (target) {
        var url = new URL(location.href);
        url.pathname = '/' + target;
        location.replace(url.toString());
    }
}

/* ============================================================
   12. AUTO COPYRIGHT YEAR
   ============================================================ */
function updateCopyright() {
    var el = $('#copyrightYear');
    if (el) { el.textContent = new Date().getFullYear(); }
}

/* ============================================================
   13. INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initScrollAnimations();
    initFormValidation();
    initEventForm();
    initRegisterForm();
    initLectureForm();
    initContactForm();
    normalizeLinks();
    softRedirect();
    updateCopyright();
});