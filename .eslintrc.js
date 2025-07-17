module.exports = {
  extends: ['prettier', '@serverless/eslint-config/node'],
  rules: {
    'no-console': 'off',
    'no-path-concat': 'off',
    'prefer-template': 'off',
    'no-restricted-syntax': 'off',
    'import/no-extraneous-dependencies': 'off',
    'no-unused-vars': 1,
  },
  env: {
    es6: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
};
