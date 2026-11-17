if (/FudoolAndroidUnified/.test(navigator.userAgent)) {
    for (const link of document.querySelectorAll('[data-parent-social]')) {
        link.href = '/play-app/external/?url=' + encodeURIComponent(link.href);
    }
}
