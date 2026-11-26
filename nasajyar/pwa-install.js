/* نصب‌پذیری و راهنمای افزودن نساج‌یار به صفحه اصلی */
(() => {
    'use strict';

    const banner = document.getElementById('pwa-install-banner');
    const installButton = document.getElementById('pwa-install-button');
    const closeButton = document.getElementById('pwa-install-close');
    const help = document.getElementById('pwa-install-help');
    const helpText = document.getElementById('pwa-help-text');
    const helpClose = document.getElementById('pwa-help-close');
    const helpOk = document.getElementById('pwa-help-ok');

    if (!banner || !installButton || !help) return;

    let installPromptEvent = null;

    function isAlreadyInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            window.navigator.standalone === true;
    }

    function isIOS() {
        return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
            (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    }

    function showBanner() {
        if (!isAlreadyInstalled()) banner.hidden = false;
    }

    function hideBanner() {
        banner.hidden = true;
    }

    function showManualInstructions() {
        if (isIOS()) {
            helpText.textContent = 'در مرورگر Safari:\n۱) دکمه اشتراک‌گذاری (مربع با فلش رو به بالا) را بزن.\n۲) گزینه Add to Home Screen یا «افزودن به صفحه اصلی» را انتخاب کن.\n۳) در پایان Add یا «افزودن» را بزن.';
        } else if (/android/i.test(window.navigator.userAgent)) {
            helpText.textContent = 'در مرورگر Chrome:\n۱) منوی سه‌نقطه بالای صفحه را باز کن.\n۲) گزینه Install app یا «نصب برنامه» را انتخاب کن؛ اگر نبود، Add to Home screen یا «افزودن به صفحه اصلی» را بزن.\n۳) نصب یا افزودن را تأیید کن.';
        } else {
            helpText.textContent = 'از منوی مرورگر گزینه Install app / نصب برنامه یا Create shortcut / ایجاد میان‌بر را انتخاب کن. برای نصب مستقیم، از Chrome یا Edge به‌روز استفاده کن.';
        }
        help.hidden = false;
    }

    function hideHelp() {
        help.hidden = true;
    }

    // این رویداد فقط در مرورگرهای پشتیبان و زمانی که سایت واجد شرایط نصب باشد ارسال می‌شود.
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        installPromptEvent = event;
        installButton.textContent = 'نصب اپلیکیشن';
        showBanner();
    });

    installButton.addEventListener('click', async () => {
        if (!installPromptEvent) {
            showManualInstructions();
            return;
        }

        const promptEvent = installPromptEvent;
        installPromptEvent = null;

        try {
            await promptEvent.prompt();
            const choice = await promptEvent.userChoice;
            if (choice && choice.outcome === 'accepted') {
                hideBanner();
            } else {
                installButton.textContent = 'تلاش دوباره برای نصب';
            }
        } catch (error) {
            console.warn('PWA install prompt was not available:', error);
            showManualInstructions();
        }
    });

    closeButton?.addEventListener('click', hideBanner);
    helpClose?.addEventListener('click', hideHelp);
    helpOk?.addEventListener('click', hideHelp);
    help?.addEventListener('click', (event) => {
        if (event.target === help) hideHelp();
    });

    window.addEventListener('appinstalled', () => {
        installPromptEvent = null;
        hideBanner();
        hideHelp();
    });

    if (!isAlreadyInstalled()) {
        // حتی پیش از آماده‌شدن پنجره بومی نصب، دکمه نصب/راهنمای نصب دیده می‌شود.
        window.addEventListener('DOMContentLoaded', showBanner, { once: true });
        if (document.readyState !== 'loading') showBanner();
    }
})();
