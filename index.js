const {
  getQuickEmailVerification,
  getQuickEmailVerificationMock,
  getQuickEmailVerificationSandbox,
} = require("./qev-wrapper");
const {
  verify
} = require("./verifier");

module.exports = {
  getQuickEmailVerification,
  getQuickEmailVerificationMock,
  getQuickEmailVerificationSandbox,
  verify
}
