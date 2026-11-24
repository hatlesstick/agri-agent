import { describe, expect, it } from "vitest";
import { authErrorMessage, signInHref, signInLabel } from "@/ui/helpers/account";

describe("account helpers", () => {
  it("builds the sign-in link with the encoded return path", () => {
    expect(signInHref("github", "/chat?tab=2")).toBe("/api/auth/github/start?returnTo=%2Fchat%3Ftab%3D2");
    expect(signInLabel("google")).toBe("Sign in with Google");
  });

  it("explains each sign-in failure in plain words", () => {
    expect(authErrorMessage("cancelled")).toBe("Sign-in was cancelled.");
    expect(authErrorMessage("state_mismatch")).toBe("Sign-in expired. Please try again.");
    expect(authErrorMessage("provider_error")).toBe("The sign-in provider did not respond. Please try again.");
    expect(authErrorMessage("something_new")).toBe("Sign-in failed. Please try again.");
    expect(authErrorMessage(null)).toBeUndefined();
  });
});
