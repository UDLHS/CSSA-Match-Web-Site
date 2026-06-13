"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LiveSnapshotRead } from "@/lib/live-types";
import { MatchCard } from "./match-card";
import { ChevR, Icon, IC } from "./icons";

/**
 * Swipeable matches carousel: Previous ← Live → Upcoming, opening centered
 * on Live (boards/home.jsx → MatchesSection). Tabs, arrows and the dot
 * indicator all drive the same scroll-snap container.
 */
export function MatchesCarousel({
  previous,
  live,
  upcoming,
}: {
  previous: LiveSnapshotRead[];
  live: LiveSnapshotRead[];
  upcoming: LiveSnapshotRead[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Default to the most useful slide: Live if any, else Previous if any,
  // else Upcoming. Beats showing an empty "no live matches" tab when there
  // are completed or upcoming ones to look at.
  const initialIndex = live.length > 0 ? 1 : previous.length > 0 ? 0 : 2;
  const [active, setActive] = useState(initialIndex);
  const router = useRouter();

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = initialIndex * el.clientWidth;
  }, [initialIndex]);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActive(i);
  };
  const onScroll = () => {
    const el = ref.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const open = (matchId: string) => router.push(`/matches/${matchId}`);

  const tabs = ["Previous", "Live", "Upcoming"] as const;
  const slides = [previous, live, upcoming];
  const emptyText = [
    "No completed matches yet.",
    "No live matches right now.",
    "No upcoming fixtures published yet.",
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-label="Matches">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h2 className="t-h2">Matches</h2>
        <span className="row" style={{ gap: 10 }}>
          <span className="tabs" role="tablist" aria-label="Match status">
            {tabs.map((t, i) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={i === active}
                className="tab"
                {...(i === active ? { "data-active": "" } : {})}
                onClick={() => go(i)}
              >
                {t}
              </button>
            ))}
          </span>
          <span className="row max-md:hidden" style={{ gap: 6 }}>
            <button
              type="button"
              className="arrow-btn"
              aria-label="Previous slide"
              disabled={active === 0}
              style={{ opacity: active === 0 ? 0.4 : 1, transform: "scaleX(-1)" }}
              onClick={() => go(Math.max(0, active - 1))}
            >
              <ChevR />
            </button>
            <button
              type="button"
              className="arrow-btn"
              aria-label="Next slide"
              disabled={active === 2}
              style={{ opacity: active === 2 ? 0.4 : 1 }}
              onClick={() => go(Math.min(2, active + 1))}
            >
              <ChevR />
            </button>
          </span>
        </span>
      </div>

      {/* Fixed-height carousel: each tab's cards scroll vertically INSIDE
          this box, so the empty tab doesn't push the leaderboard far down
          and the long Previous tab doesn't make the page feel endless. */}
      <div
        ref={ref}
        className="swipe matches-swipe"
        onScroll={onScroll}
        style={{ margin: "0 -4px", padding: "0 4px" }}
      >
        {slides.map((cards, i) => (
          <div key={tabs[i]} className="slide matches-slide">
            {cards.length === 0 ? (
              <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                  <Icon d={IC.clock} size={18} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{emptyText[i]}</span>
              </div>
            ) : (
              <div className="grid max-md:grid-cols-1 md:grid-cols-3" style={{ gap: 14, alignContent: "start" }}>
                {cards.map((s) => (
                  <MatchCard key={s.matchId} snap={s} onOpen={open} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="row" style={{ justifyContent: "center", gap: 8 }}>
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            aria-label={`Go to ${t}`}
            onClick={() => go(i)}
            style={{
              width: i === active ? 22 : 7,
              height: 7,
              borderRadius: 999,
              border: "none",
              padding: 0,
              background: i === active ? "var(--primary)" : "var(--border)",
              transition: "all .2s",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
      <div className="row md:hidden" style={{ justifyContent: "space-between", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
        <span>← Swipe for previous</span>
        <span>upcoming →</span>
      </div>
    </section>
  );
}
