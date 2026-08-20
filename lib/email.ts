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

type Fetcher = typeof fetch;

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export class ResendEmailService implements EmailService {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly fetcher: Fetcher;

  constructor(fetcher: Fetcher = fetch) {
    this.fetcher = fetcher;
    this.apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
    this.from = process.env.EMAIL_FROM?.trim() ?? "";
    if (!this.apiKey) throw new EmailConfigurationError("RESEND_API_KEY is required for EMAIL_PROVIDER=resend");
    if (!this.from) throw new EmailConfigurationError("EMAIL_FROM is required for EMAIL_PROVIDER=resend");
  }

  async sendParentInvitation(message: ParentInvitationEmail) {
    const safeUrl = escapeHtml(message.inviteUrl);
    const response = await this.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.email],
        subject: "Приглашение в elio",
        html: `<p>Ученик пригласил вас в кабинет родителя образовательной платформы elio.</p><p><a href="${safeUrl}">Принять приглашение</a></p><p>Ссылка действует 72 часа.</p>`,
        text: `Ученик пригласил вас в кабинет родителя образовательной платформы elio. Принять приглашение: ${message.inviteUrl}. Ссылка действует 72 часа.`,
        tags: [{ name: "message_type", value: "parent_invitation" }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend invitation delivery failed with status ${response.status}`);
    }
    const result = await response.json() as { id?: string };
    if (!result.id) throw new Error("Resend invitation delivery returned no message id");
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
  if (provider === "resend") return new ResendEmailService();
  if (adapters[provider]) return adapters[provider];
  throw new EmailConfigurationError(`Unsupported EMAIL_PROVIDER adapter: ${provider}`);
}
