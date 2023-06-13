/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  bail: true,
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["src"],
  moduleDirectories: ["src", "node_modules"],
  setupFiles: ["./src/setupTests.ts"],
};
