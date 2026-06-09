import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorNotice } from "./ErrorNotice";

describe("ErrorNotice", () => {
  it("shows the message as an alert", () => {
    render(<ErrorNotice message="Something broke." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something broke.");
  });

  it("renders a retry button that calls onRetry", async () => {
    const onRetry = vi.fn();
    render(<ErrorNotice message="Failed" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("omits the retry button when no onRetry is given", () => {
    render(<ErrorNotice message="Failed" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
