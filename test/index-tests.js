describe("Verify email", () => {
  const config = {
    db: {
      uris: ["localhost"],
      database: "btrz-email-verify",
      options: {
        username: "",
        password: ""
      }
    }
  };
  const { expect } = require("chai");
  const {
    verify,
    getQuickEmailVerificationSandbox,
    getQuickEmailVerificationMock
  } = require("../index");
  const {
    SimpleDao
  } = require("btrz-simple-dao");
  const {
    VerifiedEmail
  } = require("../models");
  const dao = new SimpleDao(config);
  // const verifier = getQuickEmailVerificationSandbox();
  const verifier = getQuickEmailVerificationMock();

  const blacklistedEmail = new VerifiedEmail({
    email: "blacklisted@example.com",
    blacklisted: true
  });

  const whitelisted = new VerifiedEmail({
    email: "whitelisted@example.com",
    whitelisted: true
  });
  let _blacklistedEmail = null;
  let _whitelistedEmail = null;

  beforeEach(async () => {
    _blacklistedEmail = await dao.save(blacklistedEmail);
    _whitelistedEmail = await dao.save(whitelisted);
  });

  afterEach(async () => {
    await dao.for(VerifiedEmail).removeById(_blacklistedEmail._id);
    await dao.for(VerifiedEmail).removeById(_whitelistedEmail._id);
    await dao.for(VerifiedEmail).remove({ email: "role@example.com" })
  });

  it("returns true if running out of credits", async () => {
    const result = await verify(dao, verifier, "low-credit@example.com");
    expect(result.send).to.be.eql(true);
  });

  it("returns true if email is safe_to_send", async () => {
    const result = await verify(dao, verifier, "safe-to-send@example.com");
    expect(result.send).to.be.eql(true);
    expect(result.result).to.be.eql("valid");
  });

  it("returns false is email is not safe_to_send", async () => {
    const result = await verify(dao, verifier, "invalid-email@example.com");
    expect(result.send).to.be.eql(false);
  });

  it("returns false if email is in db as blocked", async () => {
    const result = await verify(dao, verifier, "blacklisted@example.com");
    expect(result.send).to.be.eql(false);
  });

  it("return true if email is in db and marked as good", async () => {
    const result = await verify(dao, verifier, "whitelisted@example.com");
    expect(result.send).to.be.eql(true);
  });

  it("should save into the db a failure as blacklisted", async () => {
    const result = await verify(dao, verifier, "role@example.com");
    expect(result.send).to.be.eql(false);
    const saved = await dao.for(VerifiedEmail).findOne({email: "role@example.com"});
    expect(saved.blacklisted).to.be.eql(true);
  });
});