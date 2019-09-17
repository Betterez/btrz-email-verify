const status = {
  BLACKLISTED: "BLACKLISTED",
  WHITELISTED: "WHITELISTED",
  BLOCKED: "BLOCKED",
  FAILURE: "FAILURE"
}
const {
  VerifiedEmail
} = require("./models");

async function create(dao, email, currentStatus, response = {}) {
  const verifiedEmail = new VerifiedEmail({
    email,
    response,
    blacklisted: currentStatus === status.BLACKLISTED,
    whitelisted: currentStatus === status.WHITELISTED,
    blocked: currentStatus === status.BLOCKED
  });
  return dao.save(verifiedEmail);
}

async function getByEmail(dao, email) {
  return dao.for(VerifiedEmail).findOne({
    email
  });
}

async function update(dao, email, currentStatus, response) {

}

async function remove(dao, email) {

}

module.exports = {
  create,
  getByEmail,
  status,
  update,
  remove
};
