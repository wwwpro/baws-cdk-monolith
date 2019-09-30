#!/usr/bin/env node
import "source-map-support/register";
import { BawsStack } from "../lib/baws/stacks";
import { App } from "@aws-cdk/core";

const app = new App();

// Get our default region and account.
// This will be altered by the usage of the "profile" flag
// For instance `cdk deploy stack-full --profile profileName`
// However, if you're using a variety of profiles on the same machine,
// The general recommendation is to hard code the values below.
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

new BawsStack(app, `stack-full`, {
  env,
  rds: true,
  efs: true,
  cache: true,
  cdn: false
});

new BawsStack(app, 'stack-standard', {
  env,
  rds: true,
  efs: true,
  cdn: false,
});

new BawsStack(app, 'stack-min', {
  env,
  cdn: true,
});

