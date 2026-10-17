/**
 * Notification provider adapter contract.
 * Mock implementations for SMS, Email, Push. Real implementations should
 * call actual provider APIs (e.g. Kavenegar for SMS, Mailgun for Email, FCM for Push).
 */

export type NotificationChannel = "sms" | "email" | "push";

export type SendInput = {
  to: string;
  subject?: string;
  body: string;
  channel: NotificationChannel;
  templateCode?: string;
};

export type SendResult = {
  ok: boolean;
  providerMessageId?: string;
  errorMessage?: string;
};

export interface NotificationProvider {
  name: string;
  channel: NotificationChannel;
  send(input: SendInput): Promise<SendResult>;
}

class MockSmsProvider implements NotificationProvider {
  name = "kavenegar-mock";
  channel: NotificationChannel = "sms";
  async send(input: SendInput): Promise<SendResult> {
    await delay(50);
    if (!input.to || input.to.length < 5) return { ok: false, errorMessage: "Recipient invalid" };
    return { ok: true, providerMessageId: `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}

class MockEmailProvider implements NotificationProvider {
  name = "mailgun-mock";
  channel: NotificationChannel = "email";
  async send(input: SendInput): Promise<SendResult> {
    await delay(80);
    if (!input.to.includes("@")) return { ok: false, errorMessage: "Email invalid" };
    return { ok: true, providerMessageId: `mail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}

class MockPushProvider implements NotificationProvider {
  name = "fcm-mock";
  channel: NotificationChannel = "push";
  async send(input: SendInput): Promise<SendResult> {
    await delay(40);
    if (!input.to) return { ok: false, errorMessage: "Device token missing" };
    return { ok: true, providerMessageId: `push_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}

const providers: Record<NotificationChannel, NotificationProvider> = {
  sms: new MockSmsProvider(),
  email: new MockEmailProvider(),
  push: new MockPushProvider(),
};

export function getProvider(channel: NotificationChannel): NotificationProvider {
  return providers[channel];
}

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
