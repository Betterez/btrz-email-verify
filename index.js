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
  getAll,
  getByEmail,
  status,
  createOrUpdate,
  update,
  remove
} = require("./db-wrapper");

module.exports = {
  getQuickEmailVerification,
  getQuickEmailVerificationMock,
  getQuickEmailVerificationSandbox,
  create: createOrUpdate,
  remove,
  status,
  update,
  VerifiedEmail,
  verify,
  getAll,
  getByEmail
}
