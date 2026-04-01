const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const CONSENT_STORAGE_KEY = "brushbeats_analytics_consent";
const CONSENT_STATUS = {
  granted: "granted",
  denied: "denied",
  unknown: "unknown"
};

let initialized = false;

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function consentPayload(analyticsStorage) {
  return {
    analytics_storage: analyticsStorage,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };
}

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

export function getAnalyticsConsentStatus() {
  if (!canUseLocalStorage()) {
    return CONSENT_STATUS.unknown;
  }

  const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  if (stored === CONSENT_STATUS.granted || stored === CONSENT_STATUS.denied) {
    return stored;
  }

  return CONSENT_STATUS.unknown;
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsentStatus() === CONSENT_STATUS.granted;
}

export function setAnalyticsConsent(granted) {
  const nextStatus = granted ? CONSENT_STATUS.granted : CONSENT_STATUS.denied;

  if (canUseLocalStorage()) {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, nextStatus);
  }

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", consentPayload(granted ? "granted" : "denied"));
  }

  return nextStatus;
}

export function initializeAnalytics() {
  if (!analyticsEnabled() || !hasAnalyticsConsent() || initialized) {
    return false;
  }

  ensureGtagShim();
  window.gtag("consent", "default", consentPayload("denied"));
  window.gtag("consent", "update", consentPayload("granted"));

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
  if (!analyticsEnabled() || !hasAnalyticsConsent() || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}
