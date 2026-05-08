import { Construct } from 'constructs';
import * as path from 'path';
import {
  aws_ec2 as ec2,
  Duration,
  RemovalPolicy,
  Stack
} from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { AwsLogDriver, ContainerImage } from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

export interface WebProps {
  zoneName: string;
  hostedZoneId: string;
  removalPolicy: RemovalPolicy;
  ecsConf: {
    cpu: number;
    memoryLimitMiB: number;
    minCapacity: number;
    maxCapacity: number;
  };
}

export class Web extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: WebProps) {
    super(scope, id);

    const port = 8080;
    const recordName = `simple.${props.zoneName}`;
    const { zoneName, hostedZoneId, removalPolicy } = props;
    const { cpu, memoryLimitMiB, minCapacity, maxCapacity } = props.ecsConf;

    // AWS System Manager
    const certificateArn = ssm.StringParameter.fromStringParameterName(
      this,
      'CertificateArn',
      '/myaccount/shw/certificateUsEastArn'
    ).stringValue;
    const certificate = acm.Certificate.fromCertificateArn(scope, 'Cert', certificateArn);

    const vpcId = ssm.StringParameter.valueFromLookup(this, '/myaccount/shw/vpcId');
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId });

    const ecsClusterName = ssm.StringParameter.fromStringParameterName(this, 'EcsClusterName', '/myaccount/shw/ecsClusterName').stringValue;
    const ecsCluster = ecs.Cluster.fromClusterAttributes(this, 'EcsCluster', { vpc, clusterName: ecsClusterName, securityGroups: [] });

    const albListenerArn = ssm.StringParameter.valueFromLookup(this, '/myaccount/shw/albListenerArn');
    const albListener = elbv2.ApplicationListener.fromLookup(this, 'ALBListener', { listenerArn: albListenerArn });
    const loadBalancerArn = ssm.StringParameter.valueFromLookup(this, '/myaccount/shw/albArn');
    const loadBalancer = elbv2.ApplicationLoadBalancer.fromLookup(this, 'ALB', { loadBalancerArn });
    const rdsSecurityGroupId = ssm.StringParameter.valueFromLookup(this, '/myaccount/shw/rdsSecurityGroupId');
    const rdsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'RdsSecurityGroup', rdsSecurityGroupId);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', { hostedZoneId, zoneName });

    const rdsSecretArn = ssm.StringParameter.fromStringParameterName(
      this,
      "RdsSecretArn",
      "/myaccount/shw/rdsSecretArn"
    ).stringValue;
    const rdsSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "RdsSecret",
      rdsSecretArn
    );

    const environment = {
      DB_HOST: rdsSecret.secretValueFromJson('host').unsafeUnwrap().toString(),
      DB_PORT: rdsSecret.secretValueFromJson('port').unsafeUnwrap().toString(),
      DB_USER: rdsSecret.secretValueFromJson('username').unsafeUnwrap().toString(),
      DB_PASSWORD: rdsSecret.secretValueFromJson('password').unsafeUnwrap().toString(),
      DB_NAME: "shw",
    };

    const image = new DockerImageAsset(this, 'Image', {
      directory: path.join(__dirname, '../../'),
    });

    const containerName = 'shw';

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'TaskDefinition',
      { cpu, memoryLimitMiB }
    );

    const container = taskDefinition.addContainer('Container', {
      containerName,
      image: ContainerImage.fromDockerImageAsset(image),
      cpu,
      memoryLimitMiB,
      environment: environment,
      logging: new AwsLogDriver({
        streamPrefix: containerName,
        logGroup: new LogGroup(this, 'LogGroup', {
          retention: RetentionDays.ONE_WEEK,
          removalPolicy,
        }),
      }),
    });
    container.addPortMappings({
      containerPort: port,
      protocol: ecs.Protocol.TCP,
    });

    this.service = new ecs.FargateService(this, 'Ecs', {
      cluster: ecsCluster,
      taskDefinition,
      assignPublicIp: false,
      circuitBreaker: { rollback: true },
      enableExecuteCommand: true,
      propagateTags: ecs.PropagatedTagSource.SERVICE,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    });

    rdsSecurityGroup.connections.allowFrom(this.service, ec2.Port.tcp(3306), 'Allow MySQL from ECS only');

    const scaling = this.service.autoScaleTaskCount({ minCapacity, maxCapacity });

    const cpuMetric = this.service.metricCpuUtilization({ period: Duration.minutes(1) });

    scaling.scaleOnMetric('ScaleToCPU', {
      metric: cpuMetric,
      scalingSteps: [
        { upper: 10, change: -1 },
        { lower: 20, change: +1 }
      ],
      adjustmentType: autoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
    });

    const memMetric = this.service.metricMemoryUtilization({
      period: Duration.minutes(1),
    });
    scaling.scaleOnMetric('ScaleToMEM', {
      metric: memMetric,
      scalingSteps: [
        { upper: 10, change: -1 },
        { lower: 20, change: +1 }
      ],
      adjustmentType: autoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      targets: [this.service],
      port: 80,
      healthCheck: {
        port: port.toString(),
        path: '/health',
        healthyHttpCodes: '200',
        interval: Duration.seconds(10),
        healthyThresholdCount: 3,
        unhealthyThresholdCount: 3,
      },
      vpc: vpc,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    albListener.addTargetGroups('ListenerTargetGroups', {
      targetGroups: [targetGroup],
      conditions: [elbv2.ListenerCondition.hostHeaders([recordName])],
      priority: 5,
    });

    new route53.ARecord(this, 'RecordAlias', {
      zone: hostedZone,
      recordName,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(loadBalancer)
      ),
    });
  }
}