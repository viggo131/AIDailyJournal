import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewCard } from "./ReviewCard";

const FULL_REVIEW = [
  "## What I See",
  "You had a hard day.",
  "",
  "## What You Might Be Missing",
  "Consider rest.",
  "",
  "## Patterns I'm Tracking",
  "This is your first entry — no patterns yet.",
  "",
  "## Tomorrow's Moves",
  "Sleep early.",
  "",
  "## A Word to Carry",
  "Breathe.",
  "",
  '[EMOTIONS: {"energy": 2, "anxiety": 4, "clarity": 3, "gratitude": 3, "motivation": 2}]',
].join("\n");

describe("ReviewCard", () => {
  it("renders all five Patriarch sections with their headings and bodies", () => {
    render(<ReviewCard review={FULL_REVIEW} />);
    for (const title of [
      "What I See",
      "What You Might Be Missing",
      "Patterns I'm Tracking",
      "Tomorrow's Moves",
      "A Word to Carry",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("You had a hard day.")).toBeInTheDocument();
  });

  it("parses the EMOTIONS block into a chart and strips it from the visible text", () => {
    render(<ReviewCard review={FULL_REVIEW} />);
    expect(screen.getByText("Today's Emotional Snapshot")).toBeInTheDocument();
    expect(screen.queryByText(/\[EMOTIONS/)).not.toBeInTheDocument();
  });

  it("falls back to raw text when no section headings are present", () => {
    render(<ReviewCard review="The Patriarch had nothing structured to say today." />);
    expect(
      screen.getByText("The Patriarch had nothing structured to say today.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Today's Emotional Snapshot")).not.toBeInTheDocument();
  });

  it("ignores a malformed EMOTIONS block without crashing or showing a chart", () => {
    const review = "## What I See\nA day.\n\n[EMOTIONS: {not valid json}]";
    render(<ReviewCard review={review} />);
    expect(screen.getByRole("heading", { name: "What I See" })).toBeInTheDocument();
    expect(screen.queryByText("Today's Emotional Snapshot")).not.toBeInTheDocument();
  });
});
