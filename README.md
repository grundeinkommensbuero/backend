# Grundeinkommensbüro Backend

This is the backend for our website. The backend is based on serverless lambda functions.
It uses the [Serverless Framework](https://www.serverless.com/) to define infrastructure as a code and deploy the codebase to AWS easily. Functions are bundled individally through webpack with help of the [serverless-webpack](https://github.com/serverless-heaven/serverless-webpack) package. It uses AWS Cognito for User Authentication and DynamoDB as a non-relational database. The stack can be deployed to multiple stages. The API documentation can be viewed [here](https://grundeinkommensbuero.github.io/backend/index.html).

## Getting Started

- Clone the repository
- `cd serverless`
- Install dependencies via `npm install`
- Optionally install serverless cli (`npm install -g serverless`)

## Deployment`

- `cd serverless`
- Deploy the whole stack to dev: `npm run deployDev` or via the serverless cli `sls deploy`
- Deploy the whole stack to prod: `npm run deployProd` or via the serverless cli `sls deploy -s prod`
- Deploy one function (only via the serverless cli): `sls deploy -f functionName -s stageName`

## Documentation

- Make changes to docs/documentation.yml
- To watch Redoc-Documentation locally: `npm run serveDocs`
- To bundle Redoc-Documentation into html file: `npm run bundleDocs`
