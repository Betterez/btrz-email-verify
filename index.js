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
  verify,
  status,
  created,
  update,
  remove
}
