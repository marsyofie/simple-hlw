import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { Vpc, VpcProps }from './vpc';
import { Alb }from './alb';
import { Rds, RdsProps }from './rds';
import { EcsCluster, EcsClusterProps }from './ecs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

export interface FooProps extends cdk.StackProps, VpcProps, RdsProps, EcsClusterProps {}

export type InfraStackProps = Omit<FooProps, "vpc">;

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const vpcStack = new cdk.Stack(this, "VpcStack", props);
    const vpc = new Vpc(vpcStack, "Vpc", props);

    const rdsStack = new cdk.Stack(this, "RdsStack", props);
    const rds = new Rds(rdsStack, "Rds", { vpc: vpc.vpc, ...props });

    const ecsStack = new cdk.Stack(this, "EcsStack", props);
    const ecsCluster = new EcsCluster(ecsStack, "EcsCluster", { vpc: vpc.vpc, ...props });

    const albStack = new cdk.Stack(this, "AlbStack", props);
    const alb = new Alb(albStack, "Alb", { vpc: vpc.vpc, ...props, internetFacing: true });

    _add(vpcStack, "vpcId", vpc.vpc.vpcId);
    _add(rdsStack, "rdsSecurityGroupId", rds.rdsSg.securityGroupId);
    _add(rdsStack, "rdsSecretArn", rds.dbInstance.secret!.secretArn);
    _add(ecsStack, "ecsClusterName", ecsCluster.cluster.clusterName);
    _add(albStack, "albArn", alb.Alb.loadBalancerArn);
    _add(albStack, "albListenerArn", alb.AlbListener.listenerArn)
  }
}

function _addCfnExport(scope: Construct, exportName: string, value: string) {
  new cdk.CfnOutput(scope, exportName, { exportName, value });
}

function _addParamsStore(scope: Construct, name: string, value: string) {
  new StringParameter(scope, name, { parameterName: name, stringValue: value });
}

function _add(scope: Construct, exportName: string, value: string) {
  _addCfnExport(scope, `shw-${exportName}`, value); 
  _addParamsStore(scope, `/myaccount/shw/${exportName}`, value); 
}
