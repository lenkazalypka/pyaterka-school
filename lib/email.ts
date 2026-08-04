export type ParentInvitationEmail = { email: string; inviteUrl: string };

export interface EmailService {
  sendParentInvitation(message: ParentInvitationEmail): Promise<void>;
}

class DisabledEmailService implements EmailService {
  async sendParentInvitation() { /* Provider is intentionally not configured. */ }
}

class ConsoleEmailService implements EmailService {
  async sendParentInvitation(message: ParentInvitationEmail) {
    if (process.env.NODE_ENV !== "production") console.info(`[dev-email] Parent invitation for ${message.email}: ${message.inviteUrl}`);
  }
}

export function emailService(): EmailService {
  return process.env.EMAIL_PROVIDER === "console" ? new ConsoleEmailService() : new DisabledEmailService();
}

