import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { amountToMinor, YooKassaClient } from "../lib/yookassa.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, action, webhook, dashboard, admin] = await Promise.all([
  read("../supabase/migrations/202608120003_yookassa_payments.sql"),
  read("../app/student/payment/actions.ts"),
  read("../app/api/payments/yookassa/webhook/route.ts"),
  read("../components/dashboard.tsx"),
  read("../lib/supabase-admin.ts"),
]);

function restore(name, value) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }

test("YooKassa checkout uses Basic auth, idempotence, redirect confirmation and receipt", async () => {
  const shop = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  const provider = process.env.PAYMENT_PROVIDER;
  let request;
  try {
    process.env.YOOKASSA_SHOP_ID = "shop-test";
    process.env.YOOKASSA_SECRET_KEY = "secret-test";
    process.env.PAYMENT_PROVIDER = "yookassa";
    const client = new YooKassaClient(async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ id: "provider_payment_123", status: "pending", amount: { value: "100.00", currency: "RUB" }, confirmation: { type: "redirect", confirmation_url: "https://yookassa.test/pay" } }), { status: 200 });
    });
    await client.createPayment({ idempotencyKey: "00000000-0000-4000-8000-000000000001", amountMinor: 10000, currency: "RUB", returnUrl: "https://school.test/return", description: "Тариф", customerEmail: "student@example.test", metadata: { payment_id: "internal" } });
    assert.equal(request.url, "https://api.yookassa.ru/v3/payments");
    assert.match(request.init.headers.Authorization, /^Basic /);
    assert.equal(request.init.headers["Idempotence-Key"], "00000000-0000-4000-8000-000000000001");
    const body = JSON.parse(request.init.body);
    assert.equal(body.capture, true);
    assert.equal(body.confirmation.type, "redirect");
    assert.equal(body.receipt.customer.email, "student@example.test");
  } finally { restore("YOOKASSA_SHOP_ID", shop); restore("YOOKASSA_SECRET_KEY", secret); restore("PAYMENT_PROVIDER", provider); }
});

test("webhook verifies provider state before atomic subscription activation", () => {
  assert.match(webhook, /getPayment\(parsed\.data\.object\.id\)/);
  assert.match(webhook, /metadata_mismatch/);
  assert.match(webhook, /finalize_yookassa_payment/);
  assert.match(migration, /set status = 'active'/);
  assert.match(migration, /target\.amount_minor <> p_amount_minor/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.match(admin, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(dashboard, /beginSubscriptionPayment/);
  assert.match(action, /prepare_subscription_payment/);
});

test("money conversion rejects non-canonical provider amounts", () => {
  assert.equal(amountToMinor("123.45"), 12345);
  assert.throws(() => amountToMinor("123.4"));
});
