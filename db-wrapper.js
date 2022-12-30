const status = {
  BLACKLISTED: "BLACKLISTED",
  WHITELISTED: "WHITELISTED",
  BLOCKED: "BLOCKED",
  FAILURE: "FAILURE"
}
const {
  VerifiedEmail
} = require("./models");
const {
  BzDate
} = require("bz-date");

function validateStatus(currentStatus) {
  if (
    currentStatus === status.BLACKLISTED ||
    currentStatus === status.BLOCKED ||
    currentStatus === status.FAILURE ||
    currentStatus === status.WHITELISTED
  ) {
    return true;
  }
  throw new Error("INVALID_STATUS");
}

function buildData(set, currentStatus, response) {
  if (response) {
    set.QEVResponse = response;
  }
  set.blacklisted = currentStatus === status.BLACKLISTED || currentStatus === status.BLOCKED;
  set.whitelisted = currentStatus === status.WHITELISTED;
  set.blocked = currentStatus === status.BLOCKED;
  return set;
}

async function checkIfBlocked(dao, email) {
  const checkRecord = await getByEmail(dao, email);
  if (checkRecord && checkRecord.blocked) {
    throw new Error("VERIFIED_EMAIL_BLOCKED");
  }
}

async function create(dao, email, currentStatus, response = {}) {
  validateStatus(currentStatus);
  const date = (new BzDate()).toLiteral();
  const data = buildData({
    email,
    createdAt: date,
    updatedAt: date
  }, currentStatus, response);
  const verifiedEmail = new VerifiedEmail(data);
  return dao.save(verifiedEmail);
}

async function getAll(dao, pageSize, pageNumber) {
  const options = {
    skip: pageNumber * pageSize,
    limit: pageSize
  };

  return dao.for(VerifiedEmail)
    .find({}, options)
    .toArray();
}

async function getByEmail(dao, email) {
  return dao.for(VerifiedEmail).findOne({
    email
  });
}

async function update(dao, email, currentStatus, response) {
  validateStatus(currentStatus);
  await checkIfBlocked(dao, email);
  const date = (new BzDate()).toLiteral();
  const set = buildData({
    updatedAt: date
  }, currentStatus, response);
  await dao.for(VerifiedEmail).update({
    email
  }, {
    $set: set
  });
  return await getByEmail(dao, email);
}

async function remove(dao, email) {
  await checkIfBlocked(dao, email);
  return await dao.for(VerifiedEmail).remove({
    email
  });
}

module.exports = {
  create,
  getAll,
  getByEmail,
  status,
  update,
  remove
};
