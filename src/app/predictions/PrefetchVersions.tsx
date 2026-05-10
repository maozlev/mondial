"use client";

import { useEffect } from "react";

/**
 * Silently prefetches init data for all user versions into sessionStorage
 * while the user is reading the hub page, so navigation to a version is instant.
 */
export function PrefetchVersions({ versions }: { versions: number[] }) {
  useEffect(() => {
    for (const v of versions) {
      const CACHE_KEY = `init_v${v}`;
      // Skip if we already have a fresh cache
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const { ts } = JSON.parse(raw) as { ts: number };
          if (Date.now() - ts < 30_000) continue;
        }
      } catch {}

      fetch(`/api/predictions/${v}/init`)
        .then((r) => r.json())
        .then((data) => {
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
          } catch {}
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
