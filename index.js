const {
  VerifiedEmail
} = require("./models");
const {
  getQuickEmailVerification,
  getQuickEmailVerificationMock,
  getQuickEmailVerificationSandbox,
} = require("./qev-wrapper");
const {
  verify
} = require("./verifier");
const {
  status,
  created,
  update,
  remove
} = require("./db-wrapper");

module.exports = {
  getQuickEmailVerification,
  getQuickEmailVerificationMock,
  getQuickEmailVerificationSandbox,
  created,
  remove,
  status,
  update,
  VerifiedEmail,
  verify
}
