import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { isValidPrivyAppId, privyJwksUrl } from "./privy-shared.ts";
import { privyConfigured, verifyPrivyToken } from "./privy.server.ts";

const REAL_SHAPE = "clpispdty00ycl80fpueukbhl"; // 25 chars, the shape a dashboard id has

afterEach(() => {
  delete process.env.VITE_PRIVY_APP_ID;
  delete process.env.PRIVY_APP_ID;
});

describe("isValidPrivyAppId", () => {
  it("accepts a 25-character id", () => {
    assert.equal(REAL_SHAPE.length, 25);
    assert.equal(isValidPrivyAppId(REAL_SHAPE), true);
  });

  it("rejects anything else — PrivyProvider throws on a bad id during SSR, which would 500 every page", () => {
    assert.equal(isValidPrivyAppId(""), false);
    assert.equal(isValidPrivyAppId("too-short"), false);
    assert.equal(isValidPrivyAppId(REAL_SHAPE + "x"), false);
  });
});

describe("privyJwksUrl", () => {
  it("points at the app's public key set", () => {
    assert.equal(
      privyJwksUrl(REAL_SHAPE),
      `https://auth.privy.io/api/v1/apps/${REAL_SHAPE}/jwks.json`,
    );
  });
});

describe("privyConfigured", () => {
  it("is false with nothing set", () => {
    assert.equal(privyConfigured(), false);
  });

  it("reads VITE_PRIVY_APP_ID", () => {
    process.env.VITE_PRIVY_APP_ID = REAL_SHAPE;
    assert.equal(privyConfigured(), true);
  });

  it("accepts PRIVY_APP_ID for a deployment that keeps VITE_ vars off the server", () => {
    process.env.PRIVY_APP_ID = REAL_SHAPE;
    assert.equal(privyConfigured(), true);
  });

  it("treats a malformed id as unconfigured, matching the client", () => {
    process.env.VITE_PRIVY_APP_ID = "not-25-chars";
    assert.equal(privyConfigured(), false);
  });
});

describe("verifyPrivyToken", () => {
  it("returns null when Privy is not configured", async () => {
    assert.equal(await verifyPrivyToken("anything"), null);
  });

  it("returns null for a missing token", async () => {
    process.env.VITE_PRIVY_APP_ID = REAL_SHAPE;
    assert.equal(await verifyPrivyToken(undefined), null);
    assert.equal(await verifyPrivyToken(""), null);
  });

  it("returns null for a malformed token rather than throwing", async () => {
    process.env.VITE_PRIVY_APP_ID = REAL_SHAPE;
    assert.equal(await verifyPrivyToken("not.a.jwt"), null);
  });

  it("rejects an unsigned token even when its claims look right", async () => {
    process.env.VITE_PRIVY_APP_ID = REAL_SHAPE;
    const part = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const forged = [
      part({ alg: "none", typ: "JWT" }),
      part({
        sub: "did:privy:attacker",
        iss: "privy.io",
        aud: REAL_SHAPE,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      "",
    ].join(".");
    assert.equal(await verifyPrivyToken(forged), null);
  });
});
