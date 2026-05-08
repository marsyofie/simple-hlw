import { Construct } from "constructs";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { ApplicationListener, ApplicationLoadBalancer, ApplicationProtocol, ListenerAction, SslPolicy } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Peer, Port, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as acm from "aws-cdk-lib/aws-certificatemanager";

export interface AlbProps {
  vpc: ec2.Vpc;
  internetFacing: boolean;
}

export class Alb extends Construct {
  public Alb: ApplicationLoadBalancer
  public AlbListener: ApplicationListener
  
  constructor(scope: Construct, id: string, props: AlbProps) {
    super(scope, id);

    const { vpc, internetFacing } = props;

    const certificateArn = ssm.StringParameter.fromStringParameterName(
      this,
      'CertificateArn',
      '/myaccount/shw/certificateArn'
    ).stringValue;
    
    const certificate = acm.Certificate.fromCertificateArn(this, "Cert", certificateArn);

    const albSg = new SecurityGroup(this, 'albSg', {
      description: 'ALB Endpoint SG',
      vpc,
      allowAllOutbound: true,
    });
    albSg.addIngressRule(Peer.ipv4("0.0.0.0/0"), Port.tcp(80), 'Allow from anyone on port 80');
    albSg.addIngressRule(Peer.ipv4("0.0.0.0/0"), Port.tcp(443), 'Allow from anyone on port 443');
    
    this.Alb = new ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing,
      securityGroup: albSg,
    });

    this.Alb.addRedirect({
      sourceProtocol: ApplicationProtocol.HTTP,
      sourcePort: 80,
      targetProtocol: ApplicationProtocol.HTTPS,
      targetPort: 443,
    });

    this.AlbListener = this.Alb.addListener("Listener port 443", {
      port: 443,
      protocol: ApplicationProtocol.HTTPS,
      certificates: [ certificate ],
      defaultAction:ListenerAction.fixedResponse(404, {
        contentType: 'text/plain',
        messageBody: 'not found',
      }),
      sslPolicy: SslPolicy.RECOMMENDED,
    });
  }
}
