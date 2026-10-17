import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/security/crypto";
import { decideLogin } from "@/lib/auth/login-decision";

describe("platform login", () => {
  it("accepts an active user with a matching password", () => {
    const passwordHash = hashPassword("secret123");
    expect(
      decideLogin({
        userExists: true,
        active: true,
        hasPassword: true,
        passwordMatches: verifyPassword("secret123", passwordHash),
      })
    ).toEqual({ ok: true });
  });

  it("rejects a wrong password without revealing which check failed to the client shape", () => {
    const passwordHash = hashPassword("secret123");
    expect(
      decideLogin({
        userExists: true,
        active: true,
        hasPassword: true,
        passwordMatches: verifyPassword("nope", passwordHash),
      })
    ).toEqual({ ok: false, reason: "wrong_password" });
  });

  it("rejects missing, inactive, and passwordless users the same way", () => {
    expect(decideLogin({ userExists: false, active: false, hasPassword: false, passwordMatches: false }).ok).toBe(false);
    expect(decideLogin({ userExists: true, active: false, hasPassword: true, passwordMatches: true })).toEqual({
      ok: false,
      reason: "no_user_or_inactive",
    });
    expect(decideLogin({ userExists: true, active: true, hasPassword: false, passwordMatches: false })).toEqual({
      ok: false,
      reason: "no_user_or_inactive",
    });
  });
});
