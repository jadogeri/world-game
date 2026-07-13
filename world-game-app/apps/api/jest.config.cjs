/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["@swc/jest"],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  
  // 💡 THE FIX: Maps compiled .js references back to raw .ts files inside your monorepo packages
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  testMatch: [
    "<rootDir>/test/unit/**/*.unit.jest.ts",
    "<rootDir>/test/integration/**/*.integration.jest.ts",
    "<rootDir>/test/e2e/**/*.e2e.jest.ts",
  ],
  transformIgnorePatterns: ["/node_modules/(?!@repo/)"],
  clearMocks: true,
};
