import { aws_ec2 as ec2, aws_ecs as ecs } from "aws-cdk-lib";
import { Construct } from "constructs";


export interface EcsClusterProps {
  vpc: ec2.Vpc;
}

export class EcsCluster extends Construct {
  public readonly cluster: ecs.Cluster;
  
  constructor(scope: Construct, id: string, props: EcsClusterProps) {
    super(scope, id);

    const { vpc } = props;

    this.cluster = new ecs.Cluster(this, "Cluster", { vpc });
  }
}