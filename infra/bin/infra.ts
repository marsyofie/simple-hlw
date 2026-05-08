#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { aws_ec2 as ec2, aws_rds as rds } from "aws-cdk-lib";
import { InfraStack, InfraStackProps } from '../lib/infra-stack';

const app = new cdk.App();
const props: InfraStackProps = {
  vpcConf: {
    vpcCidr: "10.0.0.0/16",
    maxAzs: 2,
    natGateways: 1,
  },
  rdsConf: {
    instanceType: new ec2.InstanceType("t3.micro"),
    engineVersion: rds.MysqlEngineVersion.VER_8_0,
  },
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  env: {
    account: '806388643308',
    region: 'ap-southeast-1'
  }
}

new InfraStack(app, 'shwInfraStack', props );
