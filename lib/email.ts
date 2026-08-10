export type ParentInvitationEmail = { email: string; inviteUrl: string };

export interface EmailService {
  sendParentInvitation(message: ParentInvitationEmail): Promise<void>;
}

export type EmailAdapterRegistry = Readonly<Record<string, EmailService>>;

export class EmailConfigurationError extends Error {
  readonly code = "EMAIL_PROVIDER_NOT_CONFIGURED";

  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

class ConsoleEmailService implements EmailService {
  async sendParentInvitation(message: ParentInvitationEmail) {
    console.info(`[dev-email] Parent invitation for ${message.email}: ${message.inviteUrl}`);
  }
}

export function emailService(adapters: EmailAdapterRegistry = {}): EmailService {
  const provider = process.env.EMAIL_PROVIDER?.trim();
  if (provider === "console" && process.env.NODE_ENV !== "production") {
    return new ConsoleEmailService();
  }
  if (!provider) {
    throw new EmailConfigurationError("EMAIL_PROVIDER is required when an invitation email must be sent");
  }
  if (provider === "console") {
    throw new EmailConfigurationError("EMAIL_PROVIDER=console is development-only");
  }
  if (adapters[provider]) return adapters[provider];
  throw new EmailConfigurationError(`Unsupported EMAIL_PROVIDER adapter: ${provider}`);
}
