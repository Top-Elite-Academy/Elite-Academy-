'use client';

import Script from 'next/script';
import { useLocale } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

interface TurnstileApi {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      language: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
    },
  ): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileProps {
  /** CSP nonce from the server, so the Cloudflare script is allowed to run. */
  nonce: string | undefined;
  label: string;
  onToken: (token: string | undefined) => void;
}

/** Cloudflare Turnstile widget (spec §8 bot protection). The token is verified by the API. */
export function Turnstile({ nonce, label, onToken }: TurnstileProps) {
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const siteKey = process.env['NEXT_PUBLIC_TURNSTILE_SITE_KEY'] ?? '';

  useEffect(() => {
    const api = window.turnstile;
    if (!ready || !api || !containerRef.current) return;
    const widgetId = api.render(containerRef.current, {
      sitekey: siteKey,
      language: locale,
      callback: onToken,
      'expired-callback': () => {
        onToken(undefined);
      },
    });
    return () => {
      api.remove(widgetId);
    };
  }, [ready, siteKey, locale, onToken]);

  return (
    <div role="group" aria-label={label}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        nonce={nonce}
        strategy="afterInteractive"
        onReady={() => {
          setReady(true);
        }}
      />
      <div ref={containerRef} />
    </div>
  );
}
