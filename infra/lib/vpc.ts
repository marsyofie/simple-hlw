import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface VpcProps {
  vpcConf: {
    natGateways: number;
    maxAzs: number;
    vpcCidr: string;
  };
}

export class Vpc extends Construct {
  public readonly vpc: ec2.Vpc;
  
  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    const { natGateways, maxAzs, vpcCidr } = props.vpcConf;

    this.vpc = new ec2.Vpc(this, "vpc", {
      ipAddresses: ec2.IpAddresses.cidr(vpcCidr),
      natGateways,
      maxAzs,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: "Database",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
  }
}