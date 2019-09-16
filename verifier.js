const {
  status,
  create,
  getEmail
} = require("./db-wrapper");

function buildResponse(result, response, send, err) {
  return {
    err,
    response,
    result,
    send: send || false
  };
}

async function verify(dao, verifier, email) {
  const verifiedEmail = await getEmail(dao, email);
  if (verifiedEmail && verifiedEmail.blacklisted) {
    return buildResponse(status.BLACKLISTED, verifiedEmail.response);
  }
  if (verifiedEmail && verifiedEmail.whitelisted) {
    return buildResponse(status.WHITELISTED, verifiedEmail.response, true);
  }
  const response = await verifier(email);
  if (!response || !response.body) {
    return buildResponse(status.FAILURE, null, true);
  }
  if (response.body.success === "false") {
    return buildResponse(response.body.message, response.body, true);
  }
  const saveToSend = response.body.safe_to_send === "true";
  if (!saveToSend) {
    await create(dao, email, response.body, status.BLACKLISTED);
  }
  return buildResponse(response.body.result, response.body, saveToSend);
}

module.exports = {
  verify
};
