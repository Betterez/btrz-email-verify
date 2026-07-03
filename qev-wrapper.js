const API_KEY = process.env.QUICK_EMAIL_VERIFICATION_KEY;
const BASE_URL = "https://api.quickemailverification.com";
const API_VERSION = "v1";
const USER_AGENT = "quickemailverification-node/v1.0.4 (https://github.com/quickemailverification/quickemailverification-node)";
const NON_ERROR_4XX_STATUS_CODES = [400, 401, 402, 403, 404, 429];

class QuickEmailVerification {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  verify(email, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    return this._request("/verify", email, options, callback);
  }

  sandbox(email, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    return this._request("/verify/sandbox", email, options, callback);
  }

  _buildUrl(path, email, options = {}) {
    const url = new URL(`${BASE_URL}/${API_VERSION}${path}`);
    url.searchParams.set("email", email);
    const query = options.query || {};
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
    return url.toString();
  }

  _buildHeaders(options = {}) {
    const headers = {
      "user-agent": USER_AGENT
    };

    if (this.apiKey) {
      headers.Authorization = `token ${this.apiKey}`;
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    return headers;
  }

  async _execute(path, email, options = {}) {
    const response = await fetch(this._buildUrl(path, email, options), {
      method: "GET",
      headers: this._buildHeaders(options)
    });

    const contentType = response.headers.get("content-type") || "";
    const textBody = await response.text();
    let body = textBody;

    if (contentType.includes("json")) {
      body = JSON.parse(textBody || "{}");
    }

    const statusCode = response.status;
    if (Math.floor(statusCode / 100) === 5) {
      const error = new Error(`Error ${statusCode}`);
      error.code = statusCode;
      throw error;
    }

    if (Math.floor(statusCode / 100) === 4 && !NON_ERROR_4XX_STATUS_CODES.includes(statusCode)) {
      let message = "";
      if (typeof body === "string") {
        message = body;
      } else if (body && body.error) {
        message = body.error;
      } else {
        message = "Unable to select error message from json returned by request responsible for error";
      }
      const error = new Error(message);
      error.code = statusCode;
      throw error;
    }

    const headers = {};
    for (const [key, value] of response.headers.entries()) {
      headers[key] = value;
    }

    return {
      body,
      code: statusCode,
      headers
    };
  }

  _request(path, email, options, callback) {
    const executePromise = this._execute(path, email, options || {});
    if (typeof callback === "function") {
      executePromise
        .then((result) => callback(null, result))
        .catch((error) => callback(error));
    }
    return executePromise;
  }
}


function getQuickEmailVerification() {
  const verifier = new QuickEmailVerification(API_KEY);
  return (email) => {
    function executor(resolve, reject) {
      try {
        verifier.verify(email, (err, response) => {
          if (err) {
            resolve();
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        reject(e);
      }
    }
    return new Promise(executor);
  }
}

function getQuickEmailVerificationSandbox() {
  const verifier = new QuickEmailVerification(API_KEY);
  return (email) => {
    function executor(resolve, reject) {
      try {
        verifier.sandbox(email, (err, response) => {
          if (err) {
            resolve();
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        reject(e);
      }
    }
    return new Promise(executor);
  }
}

function getQuickEmailVerificationMock() {
  return (email) => {
    function executor(resolve, _reject) {
      if (email === "valid@example.com") {
        resolve({
          body: {
            "result": "valid",
            "reason": "accepted_email",
            "disposable": "true",
            "accept_all": "true",
            "role": "false",
            "free": "false",
            "email": "valid@example.com",
            "user": "valid",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "safe-to-send@example.com") {
        resolve({
          body: {
            "result": "valid",
            "reason": "accepted_email",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "safe-to-send@example.com",
            "user": "safe-to-send",
            "domain": "example.com",
            "safe_to_send": "true",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "free@example.com") {
        resolve({
          body: {
            "result": "valid",
            "reason": "accepted_email",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "true",
            "email": "free@example.com",
            "user": "free",
            "domain": "example.com",
            "safe_to_send": "true",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "rejected-email@example.com") {
        resolve({
          body: {
            "result": "invalid",
            "reason": "rejected_email",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "rejected-email@example.com",
            "user": "rejected-email",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "invalid-domain@example.com") {
        resolve({
          body: {
            "result": "invalid",
            "reason": "invalid_domain",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "invalid-domain@example.com",
            "user": "invalid-domain",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "whitelisted@example.com") {
        resolve({
          body: {
            "result": "invalid",
            "reason": "invalid_domain",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "invalid-domain@example.com",
            "user": "invalid-domain",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "expirated-whitelisted@example.com") {
        resolve({
          body: {
            "result": "valid",
            "reason": "accepted_email",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "expirated-whitelisted@example.com",
            "user": "expirated-whitelisted",
            "domain": "example.com",
            "safe_to_send": "true",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "expirated-whitelisted-not-safe@example.com") {
        resolve({
          body: {
            "result": "invalid",
            "reason": "invalid_email",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "expirated-whitelisted-not-safe@example.com",
            "user": "expirated-whitelisted-not-safe",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "invalid-email@example.com") {
        resolve({
          body: {
            "result": "invalid",
            "reason": "invalid_email",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "invalid-email@example.com",
            "user": "invalid-email",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "exceeded-storage@example.com") {
        resolve({
          body: {
            "result": "invalid",
            "reason": "exceeded_storage",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "exceeded-storage@example.com",
            "user": "exceeded-storage",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "no-mx-record@example.com") {
        resolve({
          body: {
            "result": "invalid",
            "reason": "no_mx_record",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "no-mx-record@example.com",
            "user": "no-mx-record",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "did-you-mean@example.com") {
        resolve({
          body: {
            "result": "invalid",
            "reason": "rejected_email",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "did-you-mean@example.com",
            "user": "did-you-mean",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "did-you-mean@example.com",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "timeout@example.com") {
        resolve({
          body: {
            "result": "unknown",
            "reason": "timeout",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "timeout@example.com",
            "user": "timeout",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "unexpected-error@example.com") {
        resolve({
          body: {
            "result": "unknown",
            "reason": "unexpected_error",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "unexpected-error@example.com",
            "user": "unexpected-error",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "no-connect@example.com") {
        resolve({
          body: {
            "result": "unknown",
            "reason": "no_connect",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "no-connect@example.com",
            "user": "no-connect",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "unavailable-smtp@example.com") {
        resolve({
          body: {
            "result": "unknown",
            "reason": "unavailable_smtp",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "unavailable-smtp@example.com",
            "user": "unavailable-smtp",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "temporarily-blocked@example.com") {
        resolve({
          body: {
            "result": "unknown",
            "reason": "temporarily_blocked",
            "disposable": "false",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "temporarily-blocked@example.com",
            "user": "temporarily-blocked",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "accept-all@example.com") {
        resolve({
          body: {
            "result": "valid",
            "reason": "accepted_email",
            "disposable": "false",
            "accept_all": "true",
            "role": "false",
            "free": "false",
            "email": "accept-all@example.com",
            "user": "accept-all",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "role@example.com") {
        resolve({
          body: {
            "result": "valid",
            "reason": "accepted_email",
            "disposable": "false",
            "accept_all": "false",
            "role": "true",
            "free": "false",
            "email": "role@example.com",
            "user": "role",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "disposable@example.com") {
        resolve({
          body: {
            "result": "valid",
            "reason": "accepted_email",
            "disposable": "true",
            "accept_all": "false",
            "role": "false",
            "free": "false",
            "email": "disposable@example.com",
            "user": "disposable",
            "domain": "example.com",
            "safe_to_send": "false",
            "did_you_mean": "",
            "success": "true",
            "message": ""
          }
        });
      }
      if (email === "low-credit@example.com") {
        resolve({
          body: {
            "success": "false",
            "message": "Low credit. Payment required"
          }
        });
      }
      resolve({
        body: {
          "result": "valid",
          "reason": "accepted_email",
          "disposable": "true",
          "accept_all": "true",
          "role": "false",
          "free": "false",
          "email": "valid@example.com",
          "user": "valid",
          "domain": "example.com",
          "safe_to_send": "false",
          "did_you_mean": "",
          "success": "true",
          "message": ""
        }
      });
    }
    return new Promise(executor);
  };
}

module.exports = {
  QuickEmailVerification,
  getQuickEmailVerification,
  getQuickEmailVerificationMock,
  getQuickEmailVerificationSandbox
};
