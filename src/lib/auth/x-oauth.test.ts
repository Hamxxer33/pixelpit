import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { X_BROKER_PROVIDER_ID, X_SOCIAL_PROVIDER_ID } from "./providers.ts";
import { activeXProviderId, xDirectAuthConfigured, xSocialProviders } from "./x-oauth.server.ts";

const KEYS = ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET", "X_CLIENT_ID", "X_CLIENT_SECRET"];

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("direct X credentials", () => {
  it("is off when nothing is set — X stays on the broker", () => {
    assert.equal(xDirectAuthConfigured(), false);
    assert.deepEqual(xSocialProviders(), {});
    assert.equal(activeXProviderId(), X_BROKER_PROVIDER_ID);
  });

  it("reads TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET", () => {
    process.env.TWITTER_CLIENT_ID = "id";
    process.env.TWITTER_CLIENT_SECRET = "secret";
    assert.equal(xDirectAuthConfigured(), true);
    assert.equal(activeXProviderId(), X_SOCIAL_PROVIDER_ID);
    assert.equal(xSocialProviders().twitter?.clientId, "id");
    assert.equal(xSocialProviders().twitter?.clientSecret, "secret");
  });

  it("accepts X_CLIENT_ID / X_CLIENT_SECRET as aliases", () => {
    process.env.X_CLIENT_ID = "id";
    process.env.X_CLIENT_SECRET = "secret";
    assert.equal(activeXProviderId(), X_SOCIAL_PROVIDER_ID);
    assert.equal(xSocialProviders().twitter?.clientId, "id");
  });

  it("prefers the TWITTER_ names when both are set", () => {
    process.env.TWITTER_CLIENT_ID = "twitter-id";
    process.env.TWITTER_CLIENT_SECRET = "twitter-secret";
    process.env.X_CLIENT_ID = "x-id";
    process.env.X_CLIENT_SECRET = "x-secret";
    assert.equal(xSocialProviders().twitter?.clientId, "twitter-id");
  });

  it("stays off when only half the pair is set", () => {
    process.env.TWITTER_CLIENT_ID = "id";
    assert.equal(xDirectAuthConfigured(), false);
    assert.equal(activeXProviderId(), X_BROKER_PROVIDER_ID);
  });

  it("treats whitespace-only values as unset", () => {
    process.env.TWITTER_CLIENT_ID = "   ";
    process.env.TWITTER_CLIENT_SECRET = "secret";
    assert.equal(xDirectAuthConfigured(), false);
  });
});

describe("the twitter provider config", () => {
  it("asks only for scopes every X app has", () => {
    process.env.TWITTER_CLIENT_ID = "id";
    process.env.TWITTER_CLIENT_SECRET = "secret";
    const twitter = xSocialProviders().twitter;
    assert.equal(twitter?.disableDefaultScope, true);
    assert.deepEqual(twitter?.scope, ["users.read", "tweet.read", "offline.access"]);
    // `users.email` is opt-in per X app; requesting it ungranted fails the
    // whole authorize request.
    assert.ok(!twitter?.scope?.includes("users.email"));
  });

  it("mints a stable non-routable email when X returns none", () => {
    process.env.TWITTER_CLIENT_ID = "id";
    process.env.TWITTER_CLIENT_SECRET = "secret";
    const map = xSocialProviders().twitter?.mapProfileToUser;
    const mapped = map?.({ data: { id: "1234", name: "Pit" } } as never);
    assert.equal((mapped as { email?: string })?.email, "1234@users.x.invalid");
  });

  it("keeps a real email when the account has one", () => {
    process.env.TWITTER_CLIENT_ID = "id";
    process.env.TWITTER_CLIENT_SECRET = "secret";
    const map = xSocialProviders().twitter?.mapProfileToUser;
    const mapped = map?.({
      data: { id: "1234", name: "Pit", email: "real@example.com" },
    } as never);
    assert.equal((mapped as { email?: string })?.email, undefined);
  });

  it("upgrades the avatar off X's 48px crop", () => {
    process.env.TWITTER_CLIENT_ID = "id";
    process.env.TWITTER_CLIENT_SECRET = "secret";
    const map = xSocialProviders().twitter?.mapProfileToUser;
    const mapped = map?.({
      data: { id: "1", name: "Pit", profile_image_url: "https://x/a_normal.jpg" },
    } as never);
    assert.equal((mapped as { image?: string })?.image, "https://x/a.jpg");
  });
});
