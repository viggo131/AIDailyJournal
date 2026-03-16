import React from "react";

export interface EmotionData {
  energy: number;
  anxiety: number;
  clarity: number;
  gratitude: number;
  motivation: number;
}

interface EmotionChartProps {
  emotions: EmotionData;
}

const DIMENSIONS: {
  key: keyof EmotionData;
  label: string;
  description: string;
  invert?: boolean;
}[] = [
  { key: "energy", label: "Energy", description: "Physical & mental vitality" },
  { key: "clarity", label: "Clarity", description: "Direction & focus" },
  { key: "motivation", label: "Motivation", description: "Drive & purpose" },
  { key: "gratitude", label: "Gratitude", description: "Appreciation & positivity" },
  { key: "anxiety", label: "Anxiety", description: "Stress & worry", invert: true },
];

function barColor(pct: number): string {
  if (pct >= 70) return "var(--accent)";
  if (pct >= 40) return "var(--text-soft)";
  return "var(--muted)";
}

export function EmotionChart({ emotions }: EmotionChartProps) {
  return (
    <div
      className="bg-card border border-border rounded-md p-5 animate-fade-in"
      style={{ animationDelay: "0.4s" }}
    >
      <h3 className="font-display text-accent text-sm font-semibold mb-1">
        Today's Emotional Snapshot
      </h3>
      <p className="text-muted text-xs mb-4">Inferred from what you shared.</p>
      <div className="space-y-3">
        {DIMENSIONS.map(({ key, label, description, invert }) => {
          const raw = emotions[key] ?? 3;
          // For anxiety: high value = bad, so invert the bar fill for visual clarity
          const display = invert ? 6 - raw : raw;
          const pct = Math.round(((display - 1) / 4) * 100);
          return (
            <div key={key}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-text text-xs font-medium">{label}</span>
                <span className="text-muted text-xs">{description}</span>
              </div>
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: barColor(pct),
                    transition: "width 0.7s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
