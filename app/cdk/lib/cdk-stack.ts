import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { Web, WebProps } from './web';

export interface CdkStackProps extends cdk.StackProps, WebProps {}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    new Web(this, 'Web', props);
  }
}
