import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "./MessageBubble";

describe("MessageBubble", () => {
  it("renders the message content", () => {
    render(<MessageBubble message={{ role: "user", content: "I felt great today." }} />);
    expect(screen.getByText("I felt great today.")).toBeInTheDocument();
  });

  it("right-aligns user messages and left-aligns assistant messages", () => {
    const { container: userC } = render(
      <MessageBubble message={{ role: "user", content: "mine" }} />
    );
    expect(userC.firstChild).toHaveClass("justify-end");

    const { container: aiC } = render(
      <MessageBubble message={{ role: "assistant", content: "theirs" }} />
    );
    expect(aiC.firstChild).toHaveClass("justify-start");
  });
});
