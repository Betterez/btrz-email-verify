const status = {
  BLACKLISTED: "BLACKLISTED",
  WHITELISTED: "WHITELISTED",
  BLOCKED: "BLOCKED",
  FAILURE: "FAILURE"
}
const {
  VerifiedEmail
} = require("./models");

async function create(dao, email, response, currentStatus) {
  const verifiedEmail = new VerifiedEmail({
    email,
    response: response.body,
    blacklisted: currentStatus === status.BLACKLISTED,
    whitelisted: currentStatus === status.WHITELISTED,
    blocked: currentStatus === status.BLOCKED
  });
  return dao.save(verifiedEmail);
}

async function getEmail(dao, email) {
  return dao.for(VerifiedEmail).findOne({
    email
  });
}

module.exports = {
  create,
  getEmail,
  status
};
