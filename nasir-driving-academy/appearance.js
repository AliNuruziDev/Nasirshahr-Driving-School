/* NASIR Academy — Persian-only interface and light/dark appearance preferences. */
(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'nasirUiTheme';
  let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';

  // Keep the application Persian and right-to-left, including devices that used an older bilingual build.
  document.documentElement.lang = 'fa';
  document.documentElement.dir = 'rtl';
  document.body.classList.remove('locale-en');
  try { localStorage.removeItem('nasirUiLanguage'); } catch (_) {}
  document.title = 'آموزشگاه رانندگی نصیرشهر | NASIR';
  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.content = 'سامانه یکپارچه آموزشگاه رانندگی نصیرشهر؛ مدیریت آموزش، پرونده و برنامه کلاس‌ها';
  }

  function updateThemeControls() {
    document.querySelectorAll('[data-theme-label]').forEach(el => {
      const nextLabel = currentTheme === 'dark' ? 'تم روشن' : 'تم تاریک';
      if (el.textContent !== nextLabel) el.textContent = nextLabel;
    });

    document.querySelectorAll('[data-theme-toggle]').forEach(el => {
      const nextLabel = currentTheme === 'dark' ? 'فعال کردن تم روشن' : 'فعال کردن تم تاریک';
      if (el.getAttribute('aria-label') !== nextLabel) el.setAttribute('aria-label', nextLabel);
      if (el.getAttribute('title') !== nextLabel) el.setAttribute('title', nextLabel);
    });

    // Show the icon for the theme that will be activated next.
    document.querySelectorAll('[data-theme-toggle] svg').forEach(svg => {
      svg.innerHTML = currentTheme === 'dark'
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'
        : '<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/>';
    });
  }

  function applyTheme() {
    document.documentElement.dataset.theme = currentTheme;
    document.documentElement.style.colorScheme = currentTheme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = currentTheme === 'dark' ? '#0d171a' : '#f2f6f5';
    updateThemeControls();
  }

  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_STORAGE_KEY, currentTheme); } catch (_) {}
    applyTheme();
  }

  function setFormsToCustomValidation(root = document) {
    root.querySelectorAll?.('form').forEach(form => { form.noValidate = true; });
  }

  function validationMessage(field) {
    if (field?.type === 'email' && field.validity?.typeMismatch) {
      return 'لطفاً یک ایمیل معتبر وارد کنید.';
    }
    if (field?.type === 'file' && field.validity?.valueMissing) {
      return 'لطفاً فایل موردنظر را انتخاب کنید.';
    }
    if (field?.type === 'tel' && field.validity?.patternMismatch) {
      return 'لطفاً شماره موبایل را به‌درستی وارد کنید.';
    }
    return 'لطفاً این فیلد را تکمیل کنید.';
  }

  document.addEventListener('click', event => {
    const themeButton = event.target.closest('[data-theme-toggle]');
    if (themeButton) {
      event.preventDefault();
      toggleTheme();
    }
  });

  // Disable browser-native English validation bubbles and show Persian messages instead.
  setFormsToCustomValidation();
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const invalid = [...form.elements].find(field => {
      if (!field || field.disabled || field.type === 'hidden') return false;
      if (field.required) {
        if (field.type === 'checkbox') return !field.checked;
        if (field.type === 'file') return !field.files?.length;
        if (!String(field.value || '').trim()) return true;
      }
      return field.willValidate && field.validity && !field.validity.valid;
    });

    if (!invalid) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const message = validationMessage(invalid);

    if (form.id === 'demoLoginForm') {
      const inline = document.getElementById('loginValidationMessage');
      if (inline) {
        inline.textContent = 'لطفاً نام یا شماره موبایل را وارد کنید.';
        inline.hidden = false;
      }
      invalid.setAttribute('aria-invalid', 'true');
      invalid.focus();
    } else if (typeof window.showToast === 'function') {
      window.showToast(message);
    }
  }, true);

  document.addEventListener('input', event => {
    if (event.target?.id === 'displayName') {
      event.target.removeAttribute('aria-invalid');
      const inline = document.getElementById('loginValidationMessage');
      if (inline) inline.hidden = true;
    }
  });

  // Forms are rendered dynamically inside the role panels, so keep their native bubbles disabled too.
  if (typeof MutationObserver !== 'undefined' && document.body) {
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes?.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches?.('form')) node.noValidate = true;
          setFormsToCustomValidation(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.NasirPreferences = {
    get theme() { return currentTheme; },
    toggleTheme,
    applyTheme
  };

  applyTheme();
})();
