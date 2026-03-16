import React from "react";
import { useDashboard } from "../../hooks/useDashboard";

// ── Mood Sparkline ─────────────────────────────────────────────────────────────

function MoodSparkline({ data }: { data: { date: string; mood: number }[] }) {
  if (data.length < 2) {
    return (
      <p style={{ color: "var(--muted)", fontSize: "0.75rem", fontStyle: "italic" }}>
        A few more entries will reveal your pattern.
      </p>
    );
  }

  const W = 320;
  const H = 56;
  const padX = 8;
  const padY = 8;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const xScale = (i: number) => padX + (i / (data.length - 1)) * innerW;
  const yScale = (mood: number) => padY + innerH - ((mood - 1) / 4) * innerH;

  const pathD = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(d.mood).toFixed(1)}`)
    .join(" ");

  const dotColor = (mood: number) => {
    if (mood >= 4) return "var(--accent)";
    if (mood >= 3) return "var(--text-soft)";
    return "var(--muted)";
  };

  const last = data[data.length - 1];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: "visible", display: "block" }}
    >
      <path d={pathD} fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.mood)} r={2 + (d.mood / 5) * 1.5} fill={dotColor(d.mood)} opacity={0.9} />
      ))}
      <circle cx={xScale(data.length - 1)} cy={yScale(last.mood)} r={7} fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity={0.5} />
    </svg>
  );
}

// ── Section label ──────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.6rem", letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.875rem" }}>
      {children}
    </p>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const { streak, totalEntries, moodHistory, topThemes, lastWisdom, lastEntryDate, isLoaded } = useDashboard();

  const maxCount = topThemes[0]?.count ?? 1;

  const monthLabel = lastEntryDate
    ? new Date(lastEntryDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--muted)", fontSize: "0.875rem" }}>
          Reading the ledger…
        </span>
      </div>
    );
  }

  if (totalEntries === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center px-16">
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1.1rem", color: "var(--text-soft)", lineHeight: 1.8 }}>
          Your chronicle begins with the first entry.
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: "0.75rem" }}>
          Return here after your first session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div style={{ padding: "1.5rem 2rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexShrink: 0, background: "var(--surface)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", color: "var(--text)", fontSize: "1.25rem", fontWeight: 600 }}>
          Your Chronicle
        </h2>
        {monthLabel && (
          <span style={{ color: "var(--muted)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {monthLabel}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "1.5rem 1.75rem 2.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* ── Pull Quote — gold accent card ── */}
        {lastWisdom && (
          <div
            className="animate-fade-in"
            style={{
              background: "rgba(201,168,108,0.08)",
              border: "1px solid rgba(201,168,108,0.4)",
              borderRadius: "var(--radius)",
              padding: "1.25rem 1.5rem 1.25rem 1.75rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Large background quotation mark */}
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: "6rem",
              lineHeight: 0.75,
              color: "var(--accent)",
              opacity: 0.12,
              position: "absolute",
              top: "0.25rem",
              left: "0.75rem",
              userSelect: "none",
              pointerEvents: "none",
            }}>
              "
            </span>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.625rem" }}>
              A Word to Carry
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1rem", color: "#e8e0d4", lineHeight: 1.8, position: "relative", zIndex: 1 }}>
              {lastWisdom}
            </p>
            <p style={{ marginTop: "0.75rem", fontSize: "0.6rem", color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75 }}>
              — The Patriarch
            </p>
          </div>
        )}

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

          {/* Streak — gold top border */}
          <div
            className="animate-fade-in"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderTop: "3px solid var(--accent)",
              borderRadius: "var(--radius)",
              padding: "1.25rem 1.5rem",
              textAlign: "center",
            }}
          >
            <Label>Current Streak</Label>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "3.25rem", fontWeight: 700, color: streak > 0 ? "var(--accent)" : "var(--muted)", lineHeight: 1 }}>
              {streak}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.08em", marginTop: "0.5rem" }}>
              {streak === 1 ? "consecutive day" : "consecutive days"}
            </div>
          </div>

          {/* Total — warm white top border */}
          <div
            className="animate-fade-in"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderTop: "3px solid var(--text-soft)",
              borderRadius: "var(--radius)",
              padding: "1.25rem 1.5rem",
              textAlign: "center",
              animationDelay: "0.05s",
            }}
          >
            <Label>Total Entries</Label>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "3.25rem", fontWeight: 700, color: "var(--text-soft)", lineHeight: 1 }}>
              {totalEntries}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.08em", marginTop: "0.5rem" }}>
              {totalEntries === 1 ? "entry in the ledger" : "entries in the ledger"}
            </div>
          </div>
        </div>

        {/* ── Mood sparkline — muted blue-ish top border ── */}
        {moodHistory.length >= 2 && (
          <div
            className="animate-fade-in"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderTop: "3px solid #8a7a6a",
              borderRadius: "var(--radius)",
              padding: "1.25rem 1.5rem",
              animationDelay: "0.1s",
            }}
          >
            <Label>Temperament — last {moodHistory.length} entries</Label>
            <MoodSparkline data={moodHistory} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem", paddingLeft: "8px", paddingRight: "8px" }}>
              <span style={{ fontSize: "0.52rem", color: "var(--muted)", letterSpacing: "0.06em" }}>low</span>
              <span style={{ fontSize: "0.52rem", color: "var(--muted)", letterSpacing: "0.06em" }}>high</span>
            </div>
          </div>
        )}

        {/* ── Recurring Themes — danger/terracotta top border ── */}
        {topThemes.length > 0 && (
          <div
            className="animate-fade-in"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderTop: "3px solid #a07860",
              borderRadius: "var(--radius)",
              padding: "1.25rem 1.5rem",
              animationDelay: "0.15s",
            }}
          >
            <Label>Recurring Themes</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
              {topThemes.map(({ tag, count }, i) => {
                const pct = (count / maxCount) * 100;
                const isTop = i === 0;
                return (
                  <div key={tag} style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <span style={{
                      fontSize: "0.72rem",
                      color: isTop ? "var(--text)" : "var(--text-soft)",
                      width: "110px",
                      flexShrink: 0,
                      textAlign: "right",
                      fontStyle: isTop ? "italic" : "normal",
                      fontFamily: isTop ? "var(--font-display)" : "inherit",
                    }}>
                      {tag}
                    </span>
                    <div style={{ flex: 1, height: "5px", background: "var(--surface)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        width: `${pct}%`,
                        height: "100%",
                        // No borderRadius on fill — WebKit clips 100%-width children when both
                        // parent and child have borderRadius + overflow:hidden
                        background: isTop ? "#c9a86c" : `rgba(201,168,108,${0.45 - i * 0.04})`,
                      }} />
                    </div>
                    <span style={{ fontSize: "0.62rem", color: "var(--muted)", width: "20px", textAlign: "right", flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", letterSpacing: "0.02em", paddingTop: "0.5rem" }}>
          Every entry builds the record. Keep writing.
        </p>
      </div>
    </div>
  );
}
