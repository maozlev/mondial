"use client";

import { useEffect } from "react";

/**
 * Stores server-fetched init data directly into sessionStorage on mount.
 * Since this runs during hydration (before any user interaction), navigation
 * to any predictions/[version] page is instantly served from cache.
 */
export function SeedInitCache({
  initDataByVersion,
}: {
  initDataByVersion: Record<number, unknown>;
}) {
  useEffect(() => {
    const ts = Date.now();
    for (const [version, data] of Object.entries(initDataByVersion)) {
      try {
        sessionStorage.setItem(`init_v${version}`, JSON.stringify({ data, ts }));
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
