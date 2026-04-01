const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

function ensureGtagShim() {
  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

export function analyticsEnabled() {
  return Boolean(MEASUREMENT_ID);
}

export function initializeAnalytics() {
  if (!analyticsEnabled() || initialized) {
    return false;
  }

  ensureGtagShim();

  const existingScript = document.querySelector(`script[data-ga4-id="${MEASUREMENT_ID}"]`);
  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.setAttribute("data-ga4-id", MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true
  });

  initialized = true;
  return true;
}

export function trackEvent(eventName, params = {}) {
  if (!analyticsEnabled() || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}
