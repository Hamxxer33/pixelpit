import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeHost, publicHosts, publicOrigins } from "./public-hosts.ts";

describe("normalizeHost", () => {
  it("accepts a bare host", () => {
    assert.equal(normalizeHost("www.pixelpit.app"), "www.pixelpit.app");
  });

  it("strips scheme, path and trailing dot, and lowercases", () => {
    assert.equal(normalizeHost("HTTPS://WWW.PixelPit.App/"), "www.pixelpit.app");
    assert.equal(normalizeHost("https://pixelpit.app/api/auth"), "pixelpit.app");
    assert.equal(normalizeHost("pixelpit.app."), "pixelpit.app");
  });

  it("keeps a port (Better Auth matches host:port)", () => {
    assert.equal(normalizeHost("http://localhost:8080"), "localhost:8080");
  });

  it("rejects empty, whitespace-bearing and wildcard values", () => {
    assert.equal(normalizeHost(undefined), null);
    assert.equal(normalizeHost("   "), null);
    assert.equal(normalizeHost("a b.com"), null);
    assert.equal(normalizeHost("*.grok-sandbox.com"), null);
  });
});

describe("publicHosts", () => {
  it("is empty when nothing is deployed (preview / local dev)", () => {
    assert.deepEqual(publicHosts({}), []);
  });

  it("reads Vercel's production, branch and deployment URLs", () => {
    const hosts = publicHosts({
      VERCEL_PROJECT_PRODUCTION_URL: "pixelpit.app",
      VERCEL_BRANCH_URL: "pixelpitapp-git-main-agentify.vercel.app",
      VERCEL_URL: "pixelpitapp-2vjjita81-agentify.vercel.app",
    });
    assert.ok(hosts.includes("pixelpit.app"));
    assert.ok(hosts.includes("pixelpitapp-git-main-agentify.vercel.app"));
    assert.ok(hosts.includes("pixelpitapp-2vjjita81-agentify.vercel.app"));
  });

  it("pairs a custom domain with its www/apex sibling", () => {
    assert.ok(
      publicHosts({ VERCEL_PROJECT_PRODUCTION_URL: "pixelpit.app" }).includes("www.pixelpit.app"),
    );
    assert.ok(publicHosts({ APP_PUBLIC_HOSTS: "www.pixelpit.app" }).includes("pixelpit.app"));
  });

  it("does not invent a www sibling for platform-assigned hostnames", () => {
    const hosts = publicHosts({ VERCEL_URL: "pixelpitapp-abc.vercel.app" });
    assert.deepEqual(hosts, ["pixelpitapp-abc.vercel.app"]);
  });

  it("splits APP_PUBLIC_HOSTS on commas and whitespace", () => {
    const hosts = publicHosts({ APP_PUBLIC_HOSTS: "www.pixelpit.app, pit.example.org" });
    assert.ok(hosts.includes("www.pixelpit.app"));
    assert.ok(hosts.includes("pit.example.org"));
  });

  it("derives the host from BETTER_AUTH_URL", () => {
    assert.ok(
      publicHosts({ BETTER_AUTH_URL: "https://www.pixelpit.app" }).includes("www.pixelpit.app"),
    );
  });

  it("de-duplicates across sources", () => {
    const hosts = publicHosts({
      BETTER_AUTH_URL: "https://pixelpit.app",
      VERCEL_PROJECT_PRODUCTION_URL: "pixelpit.app",
      APP_PUBLIC_HOSTS: "www.pixelpit.app",
    });
    assert.deepEqual([...hosts].sort(), ["pixelpit.app", "www.pixelpit.app"]);
  });
});

describe("publicOrigins", () => {
  it("is https-only — a deployed host is never served over http", () => {
    assert.deepEqual(publicOrigins({ APP_PUBLIC_HOSTS: "www.pixelpit.app" }).sort(), [
      "https://pixelpit.app",
      "https://www.pixelpit.app",
    ]);
  });
});
