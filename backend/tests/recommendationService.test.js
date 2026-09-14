const test = require("node:test");
const assert = require("node:assert/strict");

const axios = require("axios");
const recommendationService = require("../src/services/recommendationService");

const originalGet = axios.get;

test("generateRecommendationsForCustomer returns [] when ML service says no interactions", async () => {
  axios.get = async () => {
    const error = new Error("Request failed with status code 404");
    error.response = {
      status: 404,
      data: { detail: "no interactions for customer_id CUST_TEST" },
    };
    throw error;
  };

  try {
    const result =
      await recommendationService.generateRecommendationsForCustomer(
        "CUST_TEST",
      );
    assert.deepStrictEqual(result, []);
  } finally {
    axios.get = originalGet;
  }
});
