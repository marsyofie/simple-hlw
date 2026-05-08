import { aws_ec2 as ec2, aws_rds as rds, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface RdsProps {
  vpc: ec2.Vpc;
  removalPolicy: RemovalPolicy;
  rdsConf: {
    instanceType: ec2.InstanceType;
    engineVersion: rds.MysqlEngineVersion;
  };
}

export class Rds extends Construct {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly rdsSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id);

    const { instanceType, engineVersion } = props.rdsConf;
    const { vpc, removalPolicy } = props;

    const engine = rds.DatabaseInstanceEngine.mysql({ version: engineVersion });

    const parameterGroup = new rds.ParameterGroup(this, "CustomParameterGroup", {
      engine,
      description: "Custom Parameter Group",
      parameters: {
        time_zone: "Asia/Bangkok",
      },
    });

    this.rdsSg = new ec2.SecurityGroup(this, "RdsSg", {
      vpc,
      allowAllOutbound: true,
    });

    this.dbInstance = new rds.DatabaseInstance(this, "instanceWrite", {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      databaseName: "shw",
      engine,
      instanceType,
      credentials: rds.Credentials.fromGeneratedSecret("dbadmin", { secretName: `rds-secret` }),
      multiAz: true,
      allocatedStorage: 20,
      securityGroups: [this.rdsSg],
      storageType: rds.StorageType.GP3,
      removalPolicy,
      parameterGroup,
    });
  }
}