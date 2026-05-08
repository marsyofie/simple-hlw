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
    account: '806388643308',
    region: 'ap-southeast-1'
  }
}

const app = new cdk.App();
new CdkStack(app, 'ShwAppStack', props);

