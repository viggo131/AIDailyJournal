import React from "react";
import { EmotionChart, EmotionData } from "./EmotionChart";

interface ReviewCardProps {
  review: string;
}

const SECTIONS = [
  "What I See",
  "What You Might Be Missing",
  "Patterns I'm Tracking",
  "Tomorrow's Moves",
  "A Word to Carry",
];

function parseEmotions(text: string): { emotions: EmotionData | null; text: string } {
  const match = text.match(/\[EMOTIONS:\s*(\{[^}]+\})\]/);
  if (!match) return { emotions: null, text };
  try {
    const emotions = JSON.parse(match[1]) as EmotionData;
    return { emotions, text: text.replace(match[0], "").trim() };
  } catch {
    return { emotions: null, text };
  }
}

function parseReview(text: string): { title: string; body: string }[] {
  const result: { title: string; body: string }[] = [];
  for (let i = 0; i < SECTIONS.length; i++) {
    const title = SECTIONS[i];
    const nextTitle = SECTIONS[i + 1];
    const start = text.indexOf(`## ${title}`);
    if (start === -1) continue;
    const end = nextTitle ? text.indexOf(`## ${nextTitle}`) : text.length;
    const body = text.slice(start + `## ${title}`.length, end).trim();
    result.push({ title, body });
  }
  return result;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const { emotions, text: cleanedReview } = parseEmotions(review);
  const sections = parseReview(cleanedReview);

  // If parsing failed, show raw text
  if (sections.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-md p-6 selectable">
          <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{cleanedReview}</p>
        </div>
        {emotions && <EmotionChart emotions={emotions} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map(({ title, body }, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-md p-5 animate-fade-in"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <h3 className="font-display text-accent text-sm font-semibold mb-2">{title}</h3>
          <p className="text-text text-sm leading-relaxed whitespace-pre-wrap selectable">{body}</p>
        </div>
      ))}
      {emotions && <EmotionChart emotions={emotions} />}
    </div>
  );
}
