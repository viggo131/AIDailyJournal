import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputBar } from "./InputBar";

const noop = () => {};

describe("InputBar", () => {
  it("sends trimmed text and clears the field on success", async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    render(
      <InputBar onSend={onSend} onDone={noop} isLoading={false} isComplete={false} turnCount={1} />
    );

    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    await userEvent.type(box, "  hello there  ");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("hello there");
    await waitFor(() => expect(box.value).toBe(""));
  });

  it("restores the text if the send fails, so nothing is lost", async () => {
    const onSend = vi.fn().mockResolvedValue(false);
    render(
      <InputBar onSend={onSend} onDone={noop} isLoading={false} isComplete={false} turnCount={1} />
    );

    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    await userEvent.type(box, "important thought");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(box.value).toBe("important thought"));
  });

  it("disables Send when the field is empty", () => {
    render(
      <InputBar onSend={vi.fn()} onDone={noop} isLoading={false} isComplete={false} turnCount={1} />
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("offers 'I'm done' only after the minimum number of turns", () => {
    const { rerender } = render(
      <InputBar onSend={vi.fn()} onDone={noop} isLoading={false} isComplete={false} turnCount={1} />
    );
    expect(screen.queryByRole("button", { name: "I'm done" })).not.toBeInTheDocument();

    rerender(
      <InputBar onSend={vi.fn()} onDone={noop} isLoading={false} isComplete={false} turnCount={2} />
    );
    expect(screen.getByRole("button", { name: "I'm done" })).toBeInTheDocument();
  });
});
