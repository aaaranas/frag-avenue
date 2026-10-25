import { describe, it, expect } from "vitest";
import { oauthErrorMessage } from "./oauth-errors";

describe("oauthErrorMessage", () => {
  it("is null without an error", () => {
    expect(oauthErrorMessage(undefined, "sign-in")).toBeNull();
    expect(oauthErrorMessage("", "sign-in")).toBeNull();
  });

  it("explains an unlinked account differently when signing in and when connecting", () => {
    expect(oauthErrorMessage("OAuthAccountNotLinked", "sign-in")).toMatch(
      /sign in with it, then connect Google/i,
    );
    expect(oauthErrorMessage("OAuthAccountNotLinked", "connect")).toMatch(
      /already linked to another/i,
    );
  });

  it("covers a refused sign-in and a misconfigured provider", () => {
    expect(oauthErrorMessage("AccessDenied", "sign-in")).toMatch(/cancelled|verified/);
    expect(oauthErrorMessage("Configuration", "sign-in")).toMatch(/isn't available/);
  });

  it("falls back to a generic line for codes it does not know", () => {
    expect(oauthErrorMessage("SomethingNew", "connect")).toBe(
      "Couldn't sign in with Google. Try again.",
    );
  });
});
