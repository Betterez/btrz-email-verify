const assert = require("node:assert/strict");
const { describe, it, before, beforeEach, afterEach } = require("node:test");
const { config } = require("../test-helpers/config");
const { Chance } = require("chance");
const { VerifiedEmail } = require("../models");
const { SimpleDao } = require("btrz-simple-dao");
const { resetDatabase } = require("./setup");
const {
  createOrUpdate,
  update,
  remove,
  getAll,
  getByEmail,
  status
} = require("../db-wrapper");

describe("db-wrapper", () => {
  const chance = new Chance();
  const dao = new SimpleDao(config);
  let email = null;
  let extraEmails = [];
  const response = {
    result: "success"
  };

  before(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    email = chance.email();
    extraEmails = [
      chance.email(),
      chance.email(),
      chance.email()
    ]
    await createOrUpdate(dao, extraEmails[0], status.WHITELISTED);
    await createOrUpdate(dao, extraEmails[1], status.WHITELISTED);
    await createOrUpdate(dao, extraEmails[2], status.WHITELISTED);
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
      assert.equal(results.length, 2);
    });

    it("should return the last one", async () => {
      const results = await getAll(dao, 2, 1);
      assert.equal(results.length, 1);
    });
  });

  describe("getByEmail", () => {
    it("should return a created record by email", async () => {
      await createOrUpdate(dao, email, status.WHITELISTED, response);
      const result = await getByEmail(dao, email);
      assert.equal(result.email, email);
      assert.notEqual(result._id, undefined);
      assert.equal(result.whitelisted, true);
    });

    it("should return null if can't find a record", async () => {
      const result = await getByEmail(dao, chance.email());
      assert.equal(result, null);
    });
  });

  describe("createOrUpdate", async () => {
    it("should save a whitelisted un-blocked record", async () => {
      const result = await createOrUpdate(dao, email, status.WHITELISTED, response);
      assert.notEqual(result._id, undefined);
      assert.equal(result.email, email);
      assert.deepEqual(result.QEVResponse, response);
      assert.equal(result.whitelisted, true);
      assert.equal(result.blacklisted, false);
      assert.equal(result.blocked, false);
      assert.notEqual(result.createdAt.value, undefined);
      assert.deepEqual(result.updatedAt.value, result.createdAt.value);
    });

    it("should save a blacklisted un-blocked record", async () => {
      const result = await createOrUpdate(dao, email, status.BLACKLISTED, response);
      assert.notEqual(result._id, undefined);
      assert.equal(result.email, email);
      assert.deepEqual(result.QEVResponse, response);
      assert.equal(result.whitelisted, false);
      assert.equal(result.blacklisted, true);
      assert.equal(result.blocked, false);
      assert.notEqual(result.createdAt.value, undefined);
    });

    it("should save a blacklisted blocked record", async () => {
      const result = await createOrUpdate(dao, email, status.BLOCKED, response);
      assert.notEqual(result._id, undefined);
      assert.equal(result.email, email);
      assert.deepEqual(result.QEVResponse, response);
      assert.equal(result.whitelisted, false);
      assert.equal(result.blacklisted, true);
      assert.equal(result.blocked, true);
      assert.notEqual(result.createdAt.value, undefined);
    });

    it("should not create if status is invalid", async () => {
      await assert.rejects(
        createOrUpdate(dao, email, chance.word(), response),
        (error) => {
          assert.equal(error.message, "INVALID_STATUS");
          return true;
        }
      );
    });
  });

  describe("update", () => {
    it("should change the status to BLACKLISTED", async () => {
      await createOrUpdate(dao, email, status.WHITELISTED, response);
      const result = await update(dao, email, status.BLACKLISTED);
      assert.notEqual(result._id, null);
      assert.equal(result.whitelisted, false);
      assert.equal(result.blacklisted, true);
      assert.deepEqual(result.QEVResponse, response);
      assert.notEqual(result.createdAt.value, undefined);
      assert.notEqual(result.updatedAt.value, undefined);
      assert.notEqual(result.updatedAt.value, result.createdAt.value);
    });

    it("should change the status to WHITELISTED", async () => {
      await createOrUpdate(dao, email, status.BLACKLISTED, response);
      const result = await update(dao, email, status.WHITELISTED);
      assert.notEqual(result._id, null);
      assert.equal(result.whitelisted, true);
      assert.equal(result.blacklisted, false);
      assert.deepEqual(result.QEVResponse, response);
      assert.notEqual(result.createdAt.value, undefined);
      assert.notEqual(result.updatedAt.value, undefined);
      assert.notEqual(result.updatedAt.value, result.createdAt.value);
    });

    it("should change the status to BLACKLISTED and block it", async () => {
      await createOrUpdate(dao, email, status.WHITELISTED, response);
      const result = await update(dao, email, status.BLOCKED);
      assert.notEqual(result._id, null);
      assert.equal(result.whitelisted, false);
      assert.equal(result.blacklisted, true);
      assert.equal(result.blocked, true);
      assert.deepEqual(result.QEVResponse, response);
      assert.notEqual(result.createdAt.value, undefined);
      assert.notEqual(result.updatedAt.value, undefined);
      assert.notEqual(result.updatedAt.value, result.createdAt.value);
    });

    it("should not change a BLOCKED record", async () => {
      await createOrUpdate(dao, email, status.BLOCKED, response);
      await assert.rejects(
        update(dao, email, status.WHITELISTED),
        (error) => {
          assert.equal(error.message, "VERIFIED_EMAIL_BLOCKED");
          return true;
        }
      );
    });

    it("should not change if status is invalid", async () => {
      await createOrUpdate(dao, email, status.BLOCKED, response);
      await assert.rejects(
        update(dao, email, chance.word()),
        (error) => {
          assert.equal(error.message, "INVALID_STATUS");
          return true;
        }
      );
    });
  });

  describe("remove", () => {
    it("should remove a record", async () => {
      await createOrUpdate(dao, email, status.WHITELISTED, response);
      await remove(dao, email);
      const result = await getByEmail(dao, email);
      assert.equal(result, null);
    });

    it("should not remove a BLOCKED record", async () => {
      await createOrUpdate(dao, email, status.BLOCKED, response);
      await assert.rejects(
        remove(dao, email),
        (error) => {
          assert.equal(error.message, "VERIFIED_EMAIL_BLOCKED");
          return true;
        }
      );
    });
  });
});
