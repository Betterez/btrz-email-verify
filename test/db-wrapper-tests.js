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

function spyDaoWrites(dao) {
  const originalFor = dao.for.bind(dao);
  const calls = {update: [], remove: []};
  dao.for = (Model) => {
    const operator = originalFor(Model);
    const originalUpdate = operator.update.bind(operator);
    const originalRemove = operator.remove.bind(operator);
    operator.update = async (...args) => {
      calls.update.push(args);
      return originalUpdate(...args);
    };
    operator.remove = async (...args) => {
      calls.remove.push(args);
      return originalRemove(...args);
    };
    return operator;
  };
  return {
    calls,
    restore() {
      dao.for = originalFor;
    }
  };
}

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

    it("passes audit context as the last argument to dao update", async () => {
      const context = {accountId: "acc-1", userId: "user-1"};
      const spy = spyDaoWrites(dao);
      try {
        await createOrUpdate(dao, email, status.WHITELISTED, response, context);
        assert.equal(spy.calls.update.length, 1);
        const args = spy.calls.update[0];
        assert.equal(args.length, 4);
        assert.deepEqual(args[2], {upsert: true});
        assert.deepEqual(args[3], context);
      } finally {
        spy.restore();
      }
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

    it("passes audit context as the last argument to dao update without options", async () => {
      const context = {accountId: "acc-2", userId: "user-2"};
      const spy = spyDaoWrites(dao);
      try {
        await update(dao, email, status.BLACKLISTED, undefined, context);
        assert.equal(spy.calls.update.length, 1);
        const args = spy.calls.update[0];
        assert.equal(args.length, 4);
        assert.equal(args[2], undefined);
        assert.deepEqual(args[3], context);
      } finally {
        spy.restore();
      }
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

    it("passes audit context as the last argument to dao remove", async () => {
      await createOrUpdate(dao, email, status.WHITELISTED, response);
      const context = {accountId: "acc-3", userId: "user-3"};
      const spy = spyDaoWrites(dao);
      try {
        await remove(dao, email, context);
        assert.equal(spy.calls.remove.length, 1);
        const args = spy.calls.remove[0];
        assert.equal(args.length, 2);
        assert.deepEqual(args[1], context);
      } finally {
        spy.restore();
      }
    });
  });
});
