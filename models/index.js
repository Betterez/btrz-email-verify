class VerifiedEmail {
  static collectionName() {
    return "verified_emails";
  }

  static factory(literal) {
    const model = new VerifiedEmail(literal);
    model._id = literal._id;
    return model;
  }

  constructor(data) {
    if (!data || !data.email) {
      throw new Error("email is mandatory");
    }
    this.email = data.email;
    this.blacklisted = data.blacklisted || false;
    this.whitelisted = data.whitelisted || false;
    this.QEVResponse = data.QEVResponse || {};
    this.blocked = data.blocked || false;
  }
}

module.exports = {
  VerifiedEmail
};