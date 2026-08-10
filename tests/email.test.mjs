import assert from "node:assert/strict";
import test from "node:test";
import { EmailConfigurationError, emailService } from "../lib/email.ts";

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("production invitation email fails explicitly without a real adapter", () => {
  const nodeEnv = process.env.NODE_ENV;
  const provider = process.env.EMAIL_PROVIDER;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.EMAIL_PROVIDER;
    assert.throws(() => emailService(), EmailConfigurationError);
    process.env.EMAIL_PROVIDER = "console";
    assert.throws(() => emailService(), /development-only/);
  } finally {
    restoreEnv("NODE_ENV", nodeEnv);
    restoreEnv("EMAIL_PROVIDER", provider);
  }
});

test("console adapter logs invitation links only in development", async () => {
  const nodeEnv = process.env.NODE_ENV;
  const provider = process.env.EMAIL_PROVIDER;
  const originalInfo = console.info;
  const messages = [];
  try {
    process.env.NODE_ENV = "development";
    process.env.EMAIL_PROVIDER = "console";
    console.info = (message) => messages.push(String(message));
    await emailService().sendParentInvitation({
      email: "parent@example.test",
      inviteUrl: "http://localhost:3000/invite/parent?token=development-token",
    });
    assert.equal(messages.length, 1);
    assert.match(messages[0], /development-token/);
  } finally {
    console.info = originalInfo;
    restoreEnv("NODE_ENV", nodeEnv);
    restoreEnv("EMAIL_PROVIDER", provider);
  }
});

test("a production provider can be supplied as a separate adapter", async () => {
  const nodeEnv = process.env.NODE_ENV;
  const provider = process.env.EMAIL_PROVIDER;
  let delivered = false;
  try {
    process.env.NODE_ENV = "production";
    process.env.EMAIL_PROVIDER = "owner-selected-provider";
    const adapter = {
      async sendParentInvitation() { delivered = true; },
    };
    await emailService({ "owner-selected-provider": adapter }).sendParentInvitation({
      email: "parent@example.test",
      inviteUrl: "https://school.example.com/invite/parent?token=opaque",
    });
    assert.equal(delivered, true);
  } finally {
    restoreEnv("NODE_ENV", nodeEnv);
    restoreEnv("EMAIL_PROVIDER", provider);
  }
});
