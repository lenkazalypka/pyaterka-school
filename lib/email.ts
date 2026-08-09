export type ParentInvitationEmail = { email: string; inviteUrl: string };

export interface EmailService {
  sendParentInvitation(message: ParentInvitationEmail): Promise<void>;
}

class UnconfiguredEmailService implements EmailService {
  async sendParentInvitation(): Promise<void> {
    throw new Error("Production email provider is not configured");
  }
}

class ConsoleEmailService implements EmailService {
  async sendParentInvitation(message: ParentInvitationEmail): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("EMAIL_PROVIDER=console is not allowed in production");
    }
    console.info(`[dev-email] Parent invitation for ${message.email}: ${message.inviteUrl}`);
  }
}

export function emailService(): EmailService {
  const provider = process.env.EMAIL_PROVIDER?.trim();
  if (provider === "console") return new ConsoleEmailService();
  return new UnconfiguredEmailService();
}
