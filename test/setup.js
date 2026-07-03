const { config } = require("../test-helpers/config");
const { SimpleDao } = require("btrz-simple-dao");

async function resetDatabase() {
  const dao = new SimpleDao(config);
  const db = await dao.connect();
  await db.dropDatabase();
}

module.exports = {
  resetDatabase
};
