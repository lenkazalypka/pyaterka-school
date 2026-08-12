export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

type Fetcher = typeof fetch;
type YooKassaPayment = {
  id: string;
  status: string;
  paid?: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string>;
};

export class YooKassaClient {
  private readonly authorization: string;
  private readonly fetcher: Fetcher;

  constructor(fetcher: Fetcher = fetch) {
    if (process.env.PAYMENT_PROVIDER?.trim() !== "yookassa") throw new PaymentConfigurationError("PAYMENT_PROVIDER=yookassa is required");
    const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
    const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
    if (!shopId || !secretKey) throw new PaymentConfigurationError("YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required");
    this.authorization = `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
    this.fetcher = fetcher;
  }

  async createPayment(input: {
    idempotencyKey: string;
    amountMinor: number;
    currency: string;
    returnUrl: string;
    description: string;
    customerEmail: string;
    metadata: Record<string, string>;
  }) {
    const value = (input.amountMinor / 100).toFixed(2);
    const vatCode = Number(process.env.YOOKASSA_VAT_CODE ?? "1");
    if (!Number.isInteger(vatCode) || vatCode < 1 || vatCode > 6) throw new PaymentConfigurationError("YOOKASSA_VAT_CODE must be between 1 and 6");
    return this.request("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: { "Idempotence-Key": input.idempotencyKey },
      body: JSON.stringify({
        amount: { value, currency: input.currency },
        capture: true,
        confirmation: { type: "redirect", return_url: input.returnUrl },
        description: input.description.slice(0, 128),
        metadata: input.metadata,
        receipt: {
          customer: { email: input.customerEmail },
          items: [{
            description: input.description.slice(0, 128),
            quantity: "1.00",
            amount: { value, currency: input.currency },
            vat_code: vatCode,
            payment_mode: "full_payment",
            payment_subject: "service",
          }],
        },
      }),
    });
  }

  async getPayment(paymentId: string) {
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(paymentId)) throw new Error("Invalid provider payment id");
    return this.request(`https://api.yookassa.ru/v3/payments/${paymentId}`, { method: "GET" });
  }

  private async request(url: string, init: RequestInit): Promise<YooKassaPayment> {
    const response = await this.fetcher(url, {
      ...init,
      headers: {
        Authorization: this.authorization,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`YooKassa API failed with status ${response.status}`);
    return response.json() as Promise<YooKassaPayment>;
  }
}

export function amountToMinor(value: string) {
  if (!/^\d{1,9}\.\d{2}$/.test(value)) throw new Error("Invalid payment amount");
  const [whole, fraction] = value.split(".");
  return Number(whole) * 100 + Number(fraction);
}
