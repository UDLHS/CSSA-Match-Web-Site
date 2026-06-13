"use client";

import { useEffect, useRef } from "react";

/** Fires a one-time impression beacon for a shown ad (non-blocking). */
export function AdImpression({ adId }: { adId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const url = `/api/ads/${adId}/impression`;
    if (navigator.sendBeacon) navigator.sendBeacon(url);
    else void fetch(url, { method: "POST", keepalive: true });
  }, [adId]);
  return null;
}
