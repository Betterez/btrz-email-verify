const assert = require("node:assert/strict");
const { describe, it, afterEach } = require("node:test");
const nock = require("nock");
const { QuickEmailVerification } = require("../qev-wrapper");

const BASE_URL = "https://api.quickemailverification.com";

function invokeWithTimeout(method, email, options, timeoutMs = 1000) {
  const requestPromise = new Promise((resolve, reject) => {
    method(email, options, (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Method did not complete within ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([requestPromise, timeoutPromise]);
}

describe("QuickEmailVerification class", () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it("nock intercepts native fetch requests", async () => {
    const scope = nock(BASE_URL)
      .get("/v1/verify")
      .query({ email: "fetch-mock@example.com" })
      .reply(200, { success: "true", result: "valid" });

    const response = await fetch(`${BASE_URL}/v1/verify?email=fetch-mock@example.com`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { success: "true", result: "valid" });
    assert.equal(scope.isDone(), true);
  });

  it("verify sends GET request and returns quickemailverification-shaped response", async () => {
    const captured = {};
    const email = "alias+verify@example.com";
    const query = { source: "unit-test", campaign: "node-test" };
    const client = new QuickEmailVerification("new-class-token");

    const scope = nock(BASE_URL)
      .get("/v1/verify")
      .query((actualQuery) => {
        captured.query = actualQuery;
        return true;
      })
      .reply(200, function reply(_uri, requestBody) {
        captured.method = this.req.method;
        captured.headers = this.req.headers;
        captured.requestBody = requestBody;
        return {
          success: "true",
          result: "valid",
          email
        };
      });

    const response = await invokeWithTimeout(client.verify.bind(client), email, { query });

    assert.equal(response.code, 200);
    assert.deepEqual(response.body, {
      success: "true",
      result: "valid",
      email
    });
    assert.equal(captured.method, "GET");
    assert.equal(captured.query.email, email);
    assert.equal(captured.query.source, "unit-test");
    assert.equal(captured.query.campaign, "node-test");
    assert.equal(captured.headers.authorization, "token new-class-token");
    assert.equal(captured.headers["user-agent"], "quickemailverification-node/v1.0.4 (https://github.com/quickemailverification/quickemailverification-node)");
    assert.ok(captured.requestBody === "" || captured.requestBody === undefined);
    assert.equal(scope.isDone(), true);
  });

  it("sandbox supports omitted options with callback signature", async () => {
    const captured = {};
    const email = "alias+sandbox-new-class@example.com";
    const client = new QuickEmailVerification("sandbox-token");

    const scope = nock(BASE_URL)
      .get("/v1/verify/sandbox")
      .query((actualQuery) => {
        captured.query = actualQuery;
        return true;
      })
      .reply(200, function reply(_uri, requestBody) {
        captured.method = this.req.method;
        captured.headers = this.req.headers;
        captured.requestBody = requestBody;
        return {
          success: "true",
          result: "valid"
        };
      });

    const response = await new Promise((resolve, reject) => {
      client.sandbox(email, (error, payload) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(payload);
      });
    });

    assert.equal(response.code, 200);
    assert.equal(response.body.success, "true");
    assert.equal(response.body.result, "valid");
    assert.equal(captured.method, "GET");
    assert.equal(captured.query.email, email);
    assert.equal(captured.headers.authorization, "token sandbox-token");
    assert.ok(captured.requestBody === "" || captured.requestBody === undefined);
    assert.equal(scope.isDone(), true);
  });
});
