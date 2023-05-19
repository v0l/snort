/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  bail: true,
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["./src/"],
};
