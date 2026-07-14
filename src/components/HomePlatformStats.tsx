"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  buildStatCards,
  type PlatformStats,
} from "@/lib/platformStats";

const emptyStats: PlatformStats = {
  completed_consultations: 0,
  verified_physicians: 0,
  registered_patients: 0,
};

type StatsResponse = { stats: PlatformStats };

export function HomePlatformStats() {
  const [stats, setStats] = useState<PlatformStats>(emptyStats);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch<StatsResponse>("/platform-stats", {
      auth: false,
    });
    if (res.ok && res.data.stats) {
      setStats(res.data.stats);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void load();

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const onFocus = () => void load();
    const onMockChange = () => void load();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("gc-mock-state-changed", onMockChange);

    const interval = window.setInterval(() => void load(), 15_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("gc-mock-state-changed", onMockChange);
      window.clearInterval(interval);
    };
  }, [load]);

  const cards = buildStatCards(stats);

  return (
    <div
      className={`mt-10 grid grid-cols-3 gap-3 transition-opacity duration-300 ${
        ready ? "opacity-100" : "opacity-60"
      }`}
    >
      {cards.map((s) => (
        <div key={s.label} className="gc-stat-card">
          <div className="text-xl font-extrabold text-(--gc-accent) tabular-nums sm:text-2xl">
            {s.value}
          </div>
          <div className="mt-0.5 text-xs text-(--muted)">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
