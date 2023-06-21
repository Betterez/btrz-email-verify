const {
  status,
  createOrUpdate,
  getByEmail
} = require("./db-wrapper");

const {
  BzDate
} = require("bz-date");

// Exclude certain reasons from blacklisting an email
const excludedReasons = ["unexpected_error", "unavailable_smtp", "timeout"];

function isOutdated(verifiedEmail) {
  if (!verifiedEmail || !verifiedEmail.updatedAt) {
    return true;
  }
  const lastUpdate = new BzDate(verifiedEmail.updatedAt);
  const now = new BzDate();
  const diffInMilliseconds = now.getTime() - lastUpdate.getTime();
  const diffInDays = Math.round(diffInMilliseconds / (1000 * 60 * 60 * 24));
  return diffInDays > 30;
}

function buildResponse(result, response, send, logger) {
  if (logger && logger.info) {
    logger.info("buildResponse", [result, response, send]);
  }
  return {
    response,
    result,
    send: send || false
  };
}

async function verify(dao, verifier, email, logger) {
  const verifiedEmail = await getByEmail(dao, email);
  if (verifiedEmail && verifiedEmail.blacklisted) {
    return buildResponse(status.BLACKLISTED, verifiedEmail.response, false, logger);
  }
  if (verifiedEmail && verifiedEmail.whitelisted) {
    if (!isOutdated(verifiedEmail)) {
      return buildResponse(status.WHITELISTED, verifiedEmail.response, true, logger);
    }
  }
  const response = await verifier(email);
  if (!response || !response.body) {
    return buildResponse(status.FAILURE, null, true, logger);
  }
  if (response.body.success === "false") {
    return buildResponse(response.body.message, response.body, true, logger);
  }
  if (excludedReasons.includes(response.body.reason)) {
    return buildResponse(response.body.reason, response.body, true, logger);
  }
  const saveToSend = response.body.result === "valid";
  if (!saveToSend) {
    await createOrUpdate(dao, email, status.BLACKLISTED, response.body);
  } else {
    await createOrUpdate(dao, email, status.WHITELISTED, response.body);
  }
  return buildResponse(response.body.result, response.body, saveToSend, logger);
}

module.exports = {
  verify
};
