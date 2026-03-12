const js = require("@eslint/js");
const reactHooks = require("eslint-plugin-react-hooks");
const globals = require("globals");
const babelParser = require("@babel/eslint-parser");

module.exports = [
  { ignores: ["**/build/**", "**/node_modules/**", "src/components/DiscClass.jsx", "src/components/MyClasses.jsx"] },
  js.configs.recommended,
  {
    files: ["src/**/*.test.js", "src/**/*.test.jsx"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.jest },
    },
  },
  {
    files: ["src/**/*.js", "src/**/*.jsx"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ["@babel/preset-react"] },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        process: "readonly",
        require: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-empty": "warn",
      "no-duplicate-case": "warn",
      "no-undef": ["error", { typeof: true }],
      "no-useless-escape": "warn",
      "no-dupe-else-if": "warn",
      "no-constant-binary-expression": "warn",
      "no-dupe-class-members": "warn",
    },
  },
];
