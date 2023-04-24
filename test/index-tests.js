describe("Verify email", () => {
  const { config } = require("../test-helpers/config");
  const { expect } = require("chai");
  const {
    verify,
    getQuickEmailVerificationMock
  } = require("../index");
  const {
    SimpleDao
  } = require("btrz-simple-dao");
  const {
    VerifiedEmail
  } = require("../models");
  const dao = new SimpleDao(config);
  const verifier = getQuickEmailVerificationMock();

  const {
    BzDate
  } = require("bz-date");

  const sandbox = require("sinon").createSandbox();

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

  beforeEach(async () => {
    _blacklistedEmail = await dao.save(blacklistedEmail);
    _whitelistedEmail = await dao.save(whitelisted);
    _expiratedWhitelistedEmail = await dao.save(expiratedWhitelisted);
    _expiratedWhitelistedNotSafe = await dao.save(expiratedWhitelistedNotSafe);
  });

  afterEach(async () => {
    sandbox.restore();
    await dao.for(VerifiedEmail).removeById(_blacklistedEmail._id);
    await dao.for(VerifiedEmail).removeById(_whitelistedEmail._id);
    await dao.for(VerifiedEmail).remove({ email: "rejected-email@example.com" })
    await dao.for(VerifiedEmail).remove({ email: "invalid-email@example.com" })
    await dao.for(VerifiedEmail).remove({ email: "expirated-whitelisted@example.com" })
    await dao.for(VerifiedEmail).remove({ email: "expirated-whitelisted-not-safe@example.com" })
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

  it("returns false is email is invalid and set to db as blacklisted", async () => {
    const result = await verify(dao, verifier, "invalid-email@example.com");
    expect(result.send).to.be.eql(false);
    const saved = await dao.for(VerifiedEmail).findOne({email: "invalid-email@example.com"});
    expect(saved.blacklisted).to.be.eql(true);
  });

  it("returns true is email is valid and should be whitelistes", async () => {
    const result = await verify(dao, verifier, "role@example.com");
    expect(result.send).to.be.eql(true);
    const saved = await dao.for(VerifiedEmail).findOne({email: "role@example.com"});
    expect(saved.whitelisted).to.be.eql(true);
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
    const result = await verify(dao, verifier, "rejected-email@example.com");
    expect(result.send).to.be.eql(false);
    const saved = await dao.for(VerifiedEmail).findOne({email: "rejected-email@example.com"});
    expect(saved.blacklisted).to.be.eql(true);
  });

  it("you should recheck the email whitelist if the last update was 30 days ago " +
            "and then it should be saved in the db in the whitelist", async () => {
    const verifierSpy = sandbox.spy(verifier);
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
    
    expect(result.send).to.be.eql(true);
    expect(verifierSpy.calledOnce).to.be.eql(true);
    const saved = await dao.for(VerifiedEmail).find({email: "expirated-whitelisted@example.com"}).toArray();
    expect(saved.length).to.be.eql(1);
    expect(saved[0].whitelisted).to.be.eql(true);
    expect(saved[0]._id).to.be.eql(_expiratedWhitelistedEmail._id);
    expect(saved[0].updatedAt.value).to.be.greaterThan(updatedAt.value);
  });
  it("should recheck the email whitelist if the last update was 30 days ago, but then mark as blacklisted", async () => {
    const verifierSpy = sandbox.spy(verifier);
    const set = {
      $set: {
        updatedAt: (new BzDate("2023-01-01 00:00:00:000")).toLiteral()
      }
    };
    // Update the field updatedAt
    await dao.for(VerifiedEmail).update(
      {
        _id : _expiratedWhitelistedNotSafe._id
      }, set);
    const result = await verify(dao, verifierSpy, "expirated-whitelisted-not-safe@example.com");
    
    expect(result.send).to.be.eql(false);
    expect(verifierSpy.calledOnce).to.be.eql(true);
    const saved = await dao.for(VerifiedEmail).find({email: "expirated-whitelisted-not-safe@example.com"}).toArray();
    expect(saved.length).to.be.eql(1);
    expect(saved[0].blacklisted).to.be.eql(true);
    // New record created
    expect(saved[0]._id).to.not.be.eql(_expiratedWhitelistedEmail._id);
  });
});
