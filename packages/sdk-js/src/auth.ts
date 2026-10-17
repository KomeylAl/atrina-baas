/**
 * Atrina BaaS — Auth module
 *
 * Wraps the /auth/* endpoints. Manages the user session token
 * automatically — signup/login/store it in the client.
 */

import { HttpClient } from "./client";
import type { AuthSession, ProjectUser } from "./types";

export class Auth {
  constructor(private client: HttpClient) {}

  /** Signup a new project user. Returns the session. */
  async signup(input: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<AuthSession> {
    const res = await this.client.post<{ user: ProjectUser; token: string }>("/auth/signup", input);
    this.client.setUserToken(res.token);
    return { user: res.user, token: res.token };
  }

  /** Login an existing user. Returns the session. */
  async login(input: { email: string; password: string }): Promise<AuthSession> {
    const res = await this.client.post<{ user: ProjectUser; token: string }>("/auth/login", input);
    this.client.setUserToken(res.token);
    return { user: res.user, token: res.token };
  }

  /** Logout the current user (revokes the session). */
  async logout(): Promise<void> {
    await this.client.post("/auth/logout");
    this.client.setUserToken(null);
  }

  /** Get the current user. */
  async me(): Promise<ProjectUser> {
    return this.client.get<ProjectUser>("/auth/me");
  }

  /** Request a password reset email. */
  async forgotPassword(email: string): Promise<void> {
    await this.client.post("/auth/password/forgot", { email });
  }

  /** Reset password with a reset token. */
  async resetPassword(input: {
    email: string;
    newPassword: string;
    resetToken: string;
  }): Promise<void> {
    await this.client.post("/auth/password/reset", input);
  }
}
