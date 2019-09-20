class VerifiedEmail {
  static collectionName() {
    return "verified_emails";
  }

  static factory(literal) {
    const model = new VerifiedEmail(literal);
    model._id = literal._id;
    return model;
  }
  static swaggerDefinition() {
    const models = {
      "VerifiedEmail": {
        "id": "VerifiedEmail",
        "type": "object",
        "required": ["_id", "email", "whitelisted", "blacklisted", "blocked"],
        "properties": {
          "_id": {
            "type": "string",
            "description": "Unique id"
          },
          "email": {
            "type": "string",
            "description": "An email address or a string 'used' as an email address"
          },
          "whitelisted": {
            "type": "boolean",
            "description": "Indicates if the email have been whitelisted (by-pass email verification) and always send to it"
          },
          "blacklisted": {
            "type": "boolean",
            "description": "Indicates if the email have been blacklisted (by-pass email verification) and never send to it"
          },
          "blocked": {
            "type": "boolean",
            "description": "Indicates if the email status or response can be modified. (Blocked emails are serious offenders and they should not be removed or whitelisted)"
          },
          "QEVResponse": {
            "$ref": "QEVResponse"
          }
        }
      },
      "QEVResponse": {
        "id": "QEVResponse",
        "type": "object",
        "required": ["result", "message"],
        "properties": {
          "result": {
            "type": "string",
            "enum": ["valid", "invalid", "unknown"],
            "description": "Indicates if the email verifies or not"
          },
          "reason": {
            "type": "string",
            "enum": [
              "accepted_email",
              "exceeded_storage",
              "invalid_domain",
              "invalid_email",
              "no_connect",
              "no_mx_record",
              "rejected_email",
              "temporarily_blocked",
              "timeout",
              "unavailable_smtp",
              "unexpected_error"
            ],
            "description": "The reason for the result value"
          },
          "disposable": {
            "type": "string",
            "enum": ["true", "false"],
            "description": "Indicates is a disposable email address"
          },
          "accept_all": {
            "type": "string",
            "enum": ["true", "false"],
            "description": "Indicates the domain accepts any email"
          },
          "role": {
            "type": "string",
            "enum": ["true", "false"],
            "description": "Indicates this email is for a role (group)"
          },
          "free": {
            "type": "string",
            "enum": ["true", "false"],
            "description": "Indicates is a free service email (gmail, etc)"
          },
          "email": {
            "type": "string",
            "description": "The email verified",
            "example": "verified@example.com"
          },
          "user": {
            "type": "string",
            "description": "The user part of the email",
            "example": "verified"
          },
          "domain": {
            "type": "string",
            "description": "The domain part of the email",
            "example": "example.com"
          },
          "safe_to_send": {
            "type": "string",
            "enum": ["true", "false"],
            "description": "Indicates if it's 100% safe to send"
          },
          "did_you_mean": {
            "type": "string",
            "description": "suggestion when an email may have contains a typo"
          },
          "success": {
            "type": "string",
            "enum": ["true", "false"],
            "description": "Indicates if the request to the verification service was successful"
          },
          "message": {
            "type": "string",
            "description": "Message indicating why there was an error"
          }
        }
      }
    };
    return models;
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