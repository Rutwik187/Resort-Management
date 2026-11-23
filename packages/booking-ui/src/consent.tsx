"use client";

import Script from "next/script";
import { useEffect, useState, useSyncExternalStore } from "react";

/*
 * The cookie and data consent banner (WEB-08) and the tags it controls
 * (TRK-01, TRK-02, TRK-03, TRK-05). Google Tag Manager and the Meta Pixel
 * load only when the site has their IDs. Google's Consent Mode v2 starts
 * with everything denied; the guest's choice updates it, and the Meta
 * Pixel loads only after the guest allows marketing. The choice is kept in
 * the browser with the policy version, so a new version asks again.
 */

export type ConsentChoice = { analytics: boolean; marketing: boolean; version: string; at: string };

const storageKey = "bk-consent";
const consentVersion = "2026-11";
const listeners = new Set<() => void>();

function readChoice(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as ConsentChoice) : null;
    return parsed?.version === consentVersion ? parsed : null;
  } catch {
    return null;
  }
}

let cached: { raw: string | null; value: ConsentChoice | null } = { raw: null, value: null };
function snapshot(): ConsentChoice | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    return null;
  }
  if (raw !== cached.raw) cached = { raw, value: readChoice() };
  return cached.value;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The guest's saved choice, or null until they choose. Undefined while the page is still on the server. */
export function useConsent(): ConsentChoice | null | undefined {
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}

type Gtag = (...args: unknown[]) => void;
type TagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag; fbq?: (...args: unknown[]) => void };

function gtag(...args: unknown[]) {
  const w = window as TagWindow;
  if (w.gtag) {
    w.gtag(...args);
    return;
  }
  w.dataLayer = w.dataLayer || [];
  // Google's tag reads the arguments object itself, not an array.
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments);
}

function consentState(choice: ConsentChoice | null) {
  const yes = (on: boolean | undefined) => (on ? "granted" : "denied");
  return {
    analytics_storage: yes(choice?.analytics),
    ad_storage: yes(choice?.marketing),
    ad_user_data: yes(choice?.marketing),
    ad_personalization: yes(choice?.marketing),
  };
}

export function saveConsent(analytics: boolean, marketing: boolean) {
  const choice: ConsentChoice = { analytics, marketing, version: consentVersion, at: new Date().toISOString() };
  try {
    localStorage.setItem(storageKey, JSON.stringify(choice));
  } catch {
    // Not remembered: the banner asks again on the next page.
  }
  gtag("consent", "update", consentState(choice));
  listeners.forEach((listener) => listener());
}

/**
 * Sends an event to Google Tag Manager (GA4 and Google Ads read it there)
 * and, with marketing consent, to the Meta Pixel. `eventId` is shared with
 * the server's Conversions API call, so Meta counts the event once.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}, meta?: { event: string; eventId?: string; params?: Record<string, unknown> }) {
  if (typeof window === "undefined") return;
  const w = window as TagWindow;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event: name, ...params });
  if (meta && w.fbq && readChoice()?.marketing) w.fbq("track", meta.event, meta.params ?? {}, meta.eventId ? { eventID: meta.eventId } : undefined);
}

type TagsProps = {
  /** Google Tag Manager container, such as GTM-ABC123. */
  gtmId?: string;
  /** Meta Pixel ID. */
  metaPixelId?: string;
  /** Where the privacy and cookie policy is. */
  policyHref: string;
};

/** The banner and the tags, for the site's layout. */
export function SiteConsent({ gtmId, metaPixelId, policyHref }: TagsProps) {
  const choice = useConsent();
  return (
    <>
      {gtmId && (
        <>
          <Script id="bk-consent-default" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;` +
              `gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});` +
              `try{var c=JSON.parse(localStorage.getItem('${storageKey}')||'null');if(c&&c.version==='${consentVersion}')gtag('consent','update',{analytics_storage:c.analytics?'granted':'denied',ad_storage:c.marketing?'granted':'denied',ad_user_data:c.marketing?'granted':'denied',ad_personalization:c.marketing?'granted':'denied'});}catch(e){}`}
          </Script>
          <Script id="bk-gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        </>
      )}
      {metaPixelId && choice?.marketing && (
        <Script id="bk-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}
      {choice === null && <ConsentBanner policyHref={policyHref} />}
      <CampaignCapture />
    </>
  );
}

function ConsentBanner({ policyHref }: { policyHref: string }) {
  const [choosing, setChoosing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const button = "bk-button inline-flex min-h-11 items-center justify-center rounded-bk-control px-4 text-[0.95rem] font-medium transition-colors";

  return (
    <aside aria-label="Cookies and your data" className="bk-consent fixed inset-x-3 bottom-3 z-[45] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[25rem]">
      <div className="rounded-bk border border-bk-line bg-bk-card p-4 text-bk-ink shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)]">
        <p className="text-[0.95rem] font-semibold">Cookies and your data</p>
        <p className="mt-1.5 text-[0.9rem] leading-snug text-bk-muted">
          Necessary cookies keep booking and payment working. With your consent we also count visits and measure our ads. You can change this at any time on the{" "}
          <a href={policyHref} className="underline underline-offset-2">
            policies page
          </a>
          .
        </p>
        {choosing && (
          <fieldset className="mt-3 grid gap-2 text-[0.9rem]">
            <legend className="sr-only">Choose cookies</legend>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked disabled className="mt-1 size-4" />
              <span>
                <span className="font-medium">Necessary</span>
                <span className="block text-bk-muted">Your booking, payment and choices. Always on.</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 size-4 accent-[var(--bk-accent)]" />
              <span>
                <span className="font-medium">Analytics</span>
                <span className="block text-bk-muted">Counting visits and which pages help, through Google Analytics.</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 size-4 accent-[var(--bk-accent)]" />
              <span>
                <span className="font-medium">Marketing</span>
                <span className="block text-bk-muted">Measuring our Google and Meta ads.</span>
              </span>
            </label>
          </fieldset>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {choosing ? (
            <button type="button" onClick={() => saveConsent(analytics, marketing)} className={`${button} bg-bk-accent text-bk-accent-ink`}>
              Save my choice
            </button>
          ) : (
            <>
              <button type="button" onClick={() => saveConsent(true, true)} className={`${button} bg-bk-accent text-bk-accent-ink`}>
                Accept all
              </button>
              <button type="button" onClick={() => saveConsent(false, false)} className={`${button} border border-bk-line hover:bg-bk-soft`}>
                Necessary only
              </button>
              <button type="button" onClick={() => setChoosing(true)} className={`${button} px-2 underline underline-offset-4`}>
                Choose
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/** A button for the policies page that opens the choice again. */
export function ConsentSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // Nothing saved to clear.
        }
        listeners.forEach((listener) => listener());
      }}
    >
      Change cookie settings
    </button>
  );
}

/*
 * Campaign tags (TRK-04): UTM source, medium and campaign, and Google's and
 * Meta's click IDs, from the address the guest arrived on. Kept for the
 * visit in session storage, and sent with every booking and enquiry so the
 * reports can show which campaign brought it.
 */
const campaignKey = "bk-campaign";
const campaignFields = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;
export type Campaign = Partial<Record<(typeof campaignFields)[number], string>> & { landing?: string; referrer?: string };

function CampaignCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const found: Campaign = {};
      for (const field of campaignFields) {
        const value = params.get(field);
        if (value) found[field] = value.slice(0, 200);
      }
      if (Object.keys(found).length === 0 && sessionStorage.getItem(campaignKey)) return;
      if (Object.keys(found).length === 0 && document.referrer && !document.referrer.startsWith(window.location.origin)) {
        found.referrer = document.referrer.slice(0, 300);
      }
      found.landing = window.location.pathname.slice(0, 200);
      sessionStorage.setItem(campaignKey, JSON.stringify(found));
    } catch {
      // Without storage the booking simply carries no campaign.
    }
  }, []);
  return null;
}

/** The campaign this visit came from, for a booking or an enquiry. Empty when there is none. */
export function currentCampaign(): Campaign {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(campaignKey) || "{}") as Campaign;
  } catch {
    return {};
  }
}
