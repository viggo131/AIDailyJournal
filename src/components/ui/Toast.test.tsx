import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Toast } from "./Toast";
import { AppError } from "../../lib/types";

const authError: AppError = { type: "auth", message: "Your API key was rejected." };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("renders nothing when there is no error", () => {
    const { container } = render(<Toast error={null} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("presents the error message to the user", () => {
    render(<Toast error={authError} onDismiss={() => {}} />);
    expect(screen.getByText("Your API key was rejected.")).toBeInTheDocument();
  });

  it("calls onDismiss when the close button is clicked", () => {
    const onDismiss = vi.fn();
    render(<Toast error={authError} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button"));
    act(() => {
      vi.advanceTimersByTime(300); // dismiss fires after the fade-out delay
    });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("auto-dismisses after 5 seconds", () => {
    const onDismiss = vi.fn();
    render(<Toast error={authError} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(5300);
    });
    expect(onDismiss).toHaveBeenCalled();
  });
});
