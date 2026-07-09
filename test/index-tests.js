const assert = require("node:assert/strict");
const { describe, it, before, beforeEach, afterEach } = require("node:test");
const { config } = require("../test-helpers/config");
const { verify, getQuickEmailVerificationMock } = require("../index");
const { status } = require("../db-wrapper");
const { SimpleDao } = require("btrz-simple-dao");
const { VerifiedEmail } = require("../models");
const { resetDatabase } = require("./setup");

describe("Verify email", () => {
  const dao = new SimpleDao(config);
  const verifier = getQuickEmailVerificationMock();

  const {
    BzDate
  } = require("bz-date");

  const blacklistedEmail = new VerifiedEmail({
    email: "blacklisted@example.com",
    blacklisted: true
  });

  const whitelisted = new VerifiedEmail({
    email: "whitelisted@example.com",
    whitelisted: true,
    createdAt: (new BzDate()).toLiteral(),
    updatedAt: (new BzDate()).toLiteral()
  });

  const expiratedWhitelisted = new VerifiedEmail({
    email: "expirated-whitelisted@example.com",
    whitelisted: true,
    createdAt: (new BzDate()).toLiteral(),
    updatedAt: (new BzDate()).toLiteral()
  })

  const expiratedWhitelistedNotSafe = new VerifiedEmail({
    email: "expirated-whitelisted-not-safe@example.com",
    whitelisted: true,
    createdAt: (new BzDate()).toLiteral(),
    updatedAt: (new BzDate()).toLiteral()
  })

  let _blacklistedEmail = null;
  let _whitelistedEmail = null;
  let _expiratedWhitelistedEmail = null;
  let _expiratedWhitelistedNotSafe = null;

  before(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    _blacklistedEmail = await dao.save(blacklistedEmail);
    _whitelistedEmail = await dao.save(whitelisted);
    _expiratedWhitelistedEmail = await dao.save(expiratedWhitelisted);
    _expiratedWhitelistedNotSafe = await dao.save(expiratedWhitelistedNotSafe);
  });

  afterEach(async () => {
    await dao.for(VerifiedEmail).removeById(_blacklistedEmail._id);
    await dao.for(VerifiedEmail).removeById(_whitelistedEmail._id);
    await dao.for(VerifiedEmail).remove({ email: "rejected-email@example.com" })
    await dao.for(VerifiedEmail).remove({ email: "invalid-email@example.com" })
    await dao.for(VerifiedEmail).remove({ email: "expirated-whitelisted@example.com" })
    await dao.for(VerifiedEmail).remove({ email: "expirated-whitelisted-not-safe@example.com" })
  });

  it("returns true if running out of credits", async () => {
    const result = await verify(dao, verifier, "low-credit@example.com");
    assert.equal(result.send, true);
  });

  it("returns true and does not blacklist when QEV responds with 429 HTML", async () => {
    const email = "rate-limited-html@example.com";
    const html429 = "<html><head><title>429 Too Many Requests</title></head><body>429</body></html>";
    const rateLimitedVerifier = async () => ({
      code: 429,
      body: html429
    });

    const result = await verify(dao, rateLimitedVerifier, email);

    assert.equal(result.send, true);
    assert.equal(result.result, status.FAILURE);
    assert.equal(result.response, html429);
    const saved = await dao.for(VerifiedEmail).findOne({ email });
    assert.equal(saved, null);
  });

  it("returns true and does not blacklist when QEV responds with 429 JSON content-type but non-JSON body", async () => {
    const email = "rate-limited-json-ctype@example.com";
    const html429 = "<html><head><title>429 Too Many Requests</title></head><body>429</body></html>";
    const rateLimitedVerifier = async () => ({
      code: 429,
      body: html429,
      headers: { "content-type": "application/json" }
    });

    const result = await verify(dao, rateLimitedVerifier, email);

    assert.equal(result.send, true);
    assert.equal(result.result, status.FAILURE);
    assert.equal(result.response, html429);
    const saved = await dao.for(VerifiedEmail).findOne({ email });
    assert.equal(saved, null);
  });

  it("returns true and does not blacklist when QEV responds with 404 plain text", async () => {
    const email = "not-found@example.com";
    const notFoundBody = "404 page not found\n";
    const notFoundVerifier = async () => ({
      code: 404,
      body: notFoundBody
    });

    const result = await verify(dao, notFoundVerifier, email);

    assert.equal(result.send, true);
    assert.equal(result.result, status.FAILURE);
    assert.equal(result.response, notFoundBody);
    const saved = await dao.for(VerifiedEmail).findOne({ email });
    assert.equal(saved, null);
  });

  it("returns true and does not blacklist when QEV response is not a verification result object", async () => {
    const email = "malformed@example.com";
    const malformedVerifier = async () => ({
      code: 200,
      body: {}
    });

    const result = await verify(dao, malformedVerifier, email);

    assert.equal(result.send, true);
    assert.equal(result.result, status.FAILURE);
    assert.deepEqual(result.response, {});
    const saved = await dao.for(VerifiedEmail).findOne({ email });
    assert.equal(saved, null);
  });

  it("returns true if the reason for rejection is excluded (unavailable-smtp)", async () => {
    const result = await verify(dao, verifier, "unavailable-smtp@example.com");
    assert.equal(result.send, true);
  });

  it("returns true if the reason for rejection is excluded (unexpected-error)", async () => {
    const result = await verify(dao, verifier, "unexpected-error@example.com");
    assert.equal(result.send, true);
  });

  it("returns true if the reason for rejection is excluded (timeout)", async () => {
    const result = await verify(dao, verifier, "timeout@example.com");
    assert.equal(result.send, true);
  });

  it("returns true if email is safe_to_send", async () => {
    const result = await verify(dao, verifier, "safe-to-send@example.com");
    assert.equal(result.send, true);
    assert.equal(result.result, "valid");
  });

  it("returns false is email is invalid and set to db as blacklisted", async () => {
    const result = await verify(dao, verifier, "invalid-email@example.com");
    assert.equal(result.send, false);
    const saved = await dao.for(VerifiedEmail).findOne({email: "invalid-email@example.com"});
    assert.equal(saved.blacklisted, true);
  });

  it("returns true is email is valid and should be whitelistes", async () => {
    const result = await verify(dao, verifier, "role@example.com");
    assert.equal(result.send, true);
    const saved = await dao.for(VerifiedEmail).findOne({email: "role@example.com"});
    assert.equal(saved.whitelisted, true);
  });

  it("returns false if email is in db as blocked", async () => {
    const result = await verify(dao, verifier, "blacklisted@example.com");
    assert.equal(result.send, false);
  });

  it("return true if email is in db and marked as good", async () => {
    const result = await verify(dao, verifier, "whitelisted@example.com");
    assert.equal(result.send, true);
  });

  it("should save into the db a failure as blacklisted", async () => {
    const result = await verify(dao, verifier, "rejected-email@example.com");
    assert.equal(result.send, false);
    const saved = await dao.for(VerifiedEmail).findOne({email: "rejected-email@example.com"});
    assert.equal(saved.blacklisted, true);
  });

  it("you should recheck the email whitelist if the last update was 30 days ago " +
            "and then it should be saved in the db in the whitelist", async () => {
    let verifierCalls = 0;
    const verifierSpy = async (email) => {
      verifierCalls += 1;
      return verifier(email);
    };
    const updatedAt = (new BzDate("2020-01-01 00:00:00:000")).toLiteral();
    const set = {
      $set: {
        updatedAt
      }
    };
    // Update the field updatedAt
    await dao.for(VerifiedEmail).update(
      {
        _id : _expiratedWhitelistedEmail._id
      }, set);
    const result = await verify(dao, verifierSpy, "expirated-whitelisted@example.com");
    
    assert.equal(result.send, true);
    assert.equal(verifierCalls, 1);
    const saved = await dao.for(VerifiedEmail).find({email: "expirated-whitelisted@example.com"}).toArray();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].whitelisted, true);
    assert.deepEqual(saved[0]._id, _expiratedWhitelistedEmail._id);
    assert.ok(saved[0].updatedAt.value > updatedAt.value);
  });
  it("should recheck the email whitelist if the last update was 30 days ago, but then mark as blacklisted", async () => {
    let verifierCalls = 0;
    const verifierSpy = async (email) => {
      verifierCalls += 1;
      return verifier(email);
    };
    const updatedAt = (new BzDate("2023-01-01 00:00:00:000")).toLiteral();
    const set = {
      $set: {
        updatedAt
      }
    };
    // Update the field updatedAt
    await dao.for(VerifiedEmail).update(
      {
        _id : _expiratedWhitelistedNotSafe._id
      }, set);
    const result = await verify(dao, verifierSpy, "expirated-whitelisted-not-safe@example.com");
    
    assert.equal(result.send, false);
    assert.equal(verifierCalls, 1);
    const saved = await dao.for(VerifiedEmail).find({email: "expirated-whitelisted-not-safe@example.com"}).toArray();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].blacklisted, true);
    // record updated
    assert.deepEqual(saved[0]._id, _expiratedWhitelistedNotSafe._id);
    assert.ok(saved[0].updatedAt.value > updatedAt.value);
  });
});
