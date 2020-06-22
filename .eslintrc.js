module.exports = {
  extends: ['prettier', '@serverless/eslint-config/node'],
  rules: {
    'no-console': 'off',
    'no-path-concat': 'off',
    'prefer-template': 'off',
    'no-restricted-syntax': 'off',
    'import/no-extraneous-dependencies': 'off',
  },
  env: {
    es6: true,
  },
  parser: 'babel-eslint',
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
};
