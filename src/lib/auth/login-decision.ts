export type LoginFailureReason = "no_user_or_inactive" | "wrong_password";

export function decideLogin(input: {
  userExists: boolean;
  active: boolean;
  hasPassword: boolean;
  passwordMatches: boolean;
}): { ok: true } | { ok: false; reason: LoginFailureReason } {
  if (!input.userExists || !input.active || !input.hasPassword) {
    return { ok: false, reason: "no_user_or_inactive" };
  }
  if (!input.passwordMatches) {
    return { ok: false, reason: "wrong_password" };
  }
  return { ok: true };
}
