#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { CdkStack, CdkStackProps } from '../lib/cdk-stack';

const props: CdkStackProps = {
  zoneName: "nullstack.my.id",
  hostedZoneId: "Z067840977VXUWIJFV1H",
  ecsConf: {
    cpu: 256,
    memoryLimitMiB: 512,
    minCapacity: 1,
    maxCapacity: 2,
  },
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
}

const app = new cdk.App();
new CdkStack(app, 'ShwAppStack', props);

