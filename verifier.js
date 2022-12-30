const {
  status,
  create,
  getByEmail
} = require("./db-wrapper");

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
    return buildResponse(status.WHITELISTED, verifiedEmail.response, true, logger);
  }
  const response = await verifier(email);
  if (!response || !response.body) {
    return buildResponse(status.FAILURE, null, true, logger);
  }
  if (response.body.success === "false") {
    return buildResponse(response.body.message, response.body, true, logger);
  }
  const saveToSend = response.body.result === "valid";
  if (!saveToSend) {
    await create(dao, email, status.BLACKLISTED, response.body);
  } else {
    await create(dao, email, status.WHITELISTED, response.body);
  }
  return buildResponse(response.body.result, response.body, saveToSend, logger);
}

module.exports = {
  verify
};
