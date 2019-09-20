describe("db-wrapper", () => {
  const {
    config
  } = require("../test-helpers/config");
  const {
    Chance
  } = require("chance");
  const {
    VerifiedEmail
  } = require("../models");
  const chance = new Chance();
  const {
    expect
  } = require("chai");
  const {
    SimpleDao
  } = require("btrz-simple-dao");
  const dao = new SimpleDao(config);
  const {
    create,
    update,
    remove,
    getAll,
    getByEmail,
    status
  } = require("../db-wrapper");
  let email = null;
  let extraEmails = [];
  const response = {
    result: "success"
  };

  beforeEach(async () => {
    email = chance.email();
    extraEmails = [
      chance.email(),
      chance.email(),
      chance.email()
    ]
    await create(dao, extraEmails[0], status.WHITELISTED);
    await create(dao, extraEmails[1], status.WHITELISTED);
    await create(dao, extraEmails[2], status.WHITELISTED);
  });

  afterEach(async () => {
    await dao.for(VerifiedEmail).remove({ email });
    await dao.for(VerifiedEmail).remove({ email: extraEmails[0] });
    await dao.for(VerifiedEmail).remove({ email: extraEmails[1] });
    await dao.for(VerifiedEmail).remove({ email: extraEmails[2] });
  });

  describe("getAll", () => {
    it("should return the first 3", async () => {
      const results = await getAll(dao, 2, 0);
      expect(results.length).to.be.eql(2);
    });

    it("should return the last one", async () => {
      const results = await getAll(dao, 2, 1);
      expect(results.length).to.be.eql(1);
    });
  });

  describe("getByEmail", () => {
    it("should return a created record by email", async () => {
      await create(dao, email, status.WHITELISTED, response);
      const result = await getByEmail(dao, email);
      expect(result.email).to.be.eql(email);
      expect(result._id).not.to.be.eql(undefined);
      expect(result.whitelisted).to.be.eql(true);
    })

    it("should return null if can't find a record", async () => {
      const result = await getByEmail(dao, chance.email());
      expect(result).to.be.eql(null);
    });
  });

  describe("create", async () => {
    it("should save a whitelisted un-blocked record", async () => {
      const result = await create(dao, email, status.WHITELISTED, response);
      expect(result._id).to.not.be.eql(undefined);
      expect(result.email).to.be.eql(email);
      expect(result.QEVResponse).to.be.eql(response);
      expect(result.whitelisted).to.be.eql(true);
      expect(result.blacklisted).to.be.eql(false);
      expect(result.blocked).to.be.eql(false);
    });

    it("should save a blacklisted un-blocked record", async () => {
      const result = await create(dao, email, status.BLACKLISTED, response);
      expect(result._id).to.not.be.eql(undefined);
      expect(result.email).to.be.eql(email);
      expect(result.QEVResponse).to.be.eql(response);
      expect(result.whitelisted).to.be.eql(false);
      expect(result.blacklisted).to.be.eql(true);
      expect(result.blocked).to.be.eql(false);
    });

    it("should save a blacklisted blocked record", async () => {
      const result = await create(dao, email, status.BLOCKED, response);
      expect(result._id).to.not.be.eql(undefined);
      expect(result.email).to.be.eql(email);
      expect(result.QEVResponse).to.be.eql(response);
      expect(result.whitelisted).to.be.eql(false);
      expect(result.blacklisted).to.be.eql(true);
      expect(result.blocked).to.be.eql(true);
    });

    it("should not create if status is invalid", (done) => {
      create(dao, email, chance.word(), response)
        .catch((e) => {
          expect(e.message).to.be.eql("INVALID_STATUS");
          done();
        });
    });
  });

  describe("update", () => {
    it("should change the status to BLACKLISTED", async () => {
      await create(dao, email, status.WHITELISTED, response);
      const result = await update(dao, email, status.BLACKLISTED);
      expect(result._id).to.not.be.eql(null);
      expect(result.whitelisted).to.be.eql(false);
      expect(result.blacklisted).to.be.eql(true);
      expect(result.QEVResponse).to.be.eql(response);
    });

    it("should change the status to WHITELISTED", async () => {
      await create(dao, email, status.BLACKLISTED, response);
      const result = await update(dao, email, status.WHITELISTED);
      expect(result._id).to.not.be.eql(null);
      expect(result.whitelisted).to.be.eql(true);
      expect(result.blacklisted).to.be.eql(false);
      expect(result.QEVResponse).to.be.eql(response);
    });

    it("should change the status to BLACKLISTED and block it", async () => {
      await create(dao, email, status.WHITELISTED, response);
      const result = await update(dao, email, status.BLOCKED);
      expect(result._id).to.not.be.eql(null);
      expect(result.whitelisted).to.be.eql(false);
      expect(result.blacklisted).to.be.eql(true);
      expect(result.blocked).to.be.eql(true);
      expect(result.QEVResponse).to.be.eql(response);
    });

    it("should not change a BLOCKED record", (done) => {
      create(dao, email, status.BLOCKED, response)
        .then(() => {
          return update(dao, email, status.WHITELISTED);
        })
        .catch((e) => {
          expect(e.message).to.be.eql("VERIFIED_EMAIL_BLOCKED");
          done();
        });
    });

    it("should not change if status is invalid", (done) => {
      create(dao, email, status.BLOCKED, response)
        .then(() => {
          return update(dao, email, chance.word());
        })
        .catch((e) => {
          expect(e.message).to.be.eql("INVALID_STATUS");
          done();
        });
    });
  });

  describe("remove", () => {
    it("should remove a record", async () => {
      await create(dao, email, status.WHITELISTED, response);
      await remove(dao, email);
      const result = await getByEmail(dao, email);
      expect(result).to.be.eql(null);
    });

    it("should not remove a BLOCKED record", (done) => {
      create(dao, email, status.BLOCKED, response)
        .then(() => {
          return remove(dao, email);
        })
        .catch((e) => {
          expect(e.message).to.be.eql("VERIFIED_EMAIL_BLOCKED");
          done();
        });
    })
  });
});
