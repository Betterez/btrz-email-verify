before(async () => {
  const {
    config
  } = require("../test-helpers/config");
  const {
    SimpleDao
  } = require("btrz-simple-dao");
  const dao = new SimpleDao(config);
  const db = await dao.connect();

  return db.dropDatabase().then((db) => {
    console.log(`Database '${config.db.options.database}' dropped OK!`);
  });
});
