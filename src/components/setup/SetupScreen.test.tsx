import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetupScreen } from "./SetupScreen";
import { NetworkError } from "../../lib/openai";

function setup(setApiKey: (k: string) => Promise<boolean>) {
  const onSuccess = vi.fn();
  render(<SetupScreen onSuccess={onSuccess} setApiKey={setApiKey} />);
  return { onSuccess };
}

describe("SetupScreen", () => {
  it("rejects a key that doesn't start with sk- without calling the API", async () => {
    const setApiKey = vi.fn();
    const { onSuccess } = setup(setApiKey);

    await userEvent.type(screen.getByPlaceholderText("sk-..."), "not-a-key");
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/keys start with sk-/i)).toBeInTheDocument();
    expect(setApiKey).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("calls onSuccess when the key validates", async () => {
    const setApiKey = vi.fn().mockResolvedValue(true);
    const { onSuccess } = setup(setApiKey);

    await userEvent.type(screen.getByPlaceholderText("sk-..."), "sk-valid-key");
    await userEvent.click(screen.getByRole("button"));

    expect(setApiKey).toHaveBeenCalledWith("sk-valid-key");
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("shows a rejection message when the key is refused", async () => {
    const setApiKey = vi.fn().mockResolvedValue(false);
    const { onSuccess } = setup(setApiKey);

    await userEvent.type(screen.getByPlaceholderText("sk-..."), "sk-bad-key");
    await userEvent.click(screen.getByRole("button"));

    expect(await screen.findByText(/rejected by openai/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("surfaces a network failure to the user", async () => {
    const setApiKey = vi.fn().mockRejectedValue(new NetworkError());
    setup(setApiKey);

    await userEvent.type(screen.getByPlaceholderText("sk-..."), "sk-offline");
    await userEvent.click(screen.getByRole("button"));

    expect(await screen.findByText(/no internet connection/i)).toBeInTheDocument();
  });
});
