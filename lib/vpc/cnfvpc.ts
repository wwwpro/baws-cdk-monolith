import { Construct, Stack, StackProps, Duration, CfnTag, Lazy, IStringProducer } from "@aws-cdk/core";
import netparser = require("netparser");
import {
  CfnVPC,
  CfnInternetGateway,
  CfnSubnet,
  CfnVPCGatewayAttachment,
} from "@aws-cdk/aws-ec2";

export class BawsVPC extends Stack {
  //Options
  name: string;
  numzones: number;
  baseAddress: string;
  baseCidrSize: string;

  vpc: CfnVPC;
  vpcId:string;
  subnets:string[]  = [];
  publicSubnets: CfnSubnet[] = [];

  gateway: CfnInternetGateway;

  constructor(scope: Construct, id: string, props: VPCProps) {
    super(scope, id, props);
    // Get VPC will create one of it doesn't exist.
    this.name = props.config.name;
    this.numzones = props.config.numPublicSubnets;
    this.baseAddress = props.config.baseAddress;
    this.baseCidrSize = props.config.baseCidrSize;

    this.vpc = this.createVPC();
  }

  private createVPC = (): CfnVPC => {
    // Create our VPC.
    this.vpc = new CfnVPC(this, "baws-vpc", {
      // Always the largest number of addresses.
      cidrBlock: this.baseAddress + "/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      instanceTenancy: "default",
      tags: [
        {
          key: "bawsVpc",
          value: "cfn"
        },
        {
          key: "Name",
          value: this.name
        }
      ]
    });

    this.vpcId = this.vpc.ref;

    this.createSubnets();
    this.createIGateway();

    return this.vpc;
  };

  private createSubnets = (): void => {
    // Get the zones from our context.
    const zones: string[] = this.availabilityZones;

    this.numzones = zones.length > this.numzones ? this.numzones : zones.length;

    const startAddress: string | null = netparser.nextNetwork(
      this.baseAddress + "/" + this.baseCidrSize
    );

    // Create the zones in our VPC.
    if (startAddress != null) {
      let nextAddress = startAddress;

      // Create our subnets, one in each zone.
      for (let i = 0; i <= this.numzones; i++) {
        const subnet = new CfnSubnet(this, "baws-subnet" + i, {
          cidrBlock: nextAddress,
          mapPublicIpOnLaunch: true,
          vpcId: this.vpc.ref,
          availabilityZone: zones[i],
          tags: [{ key: "Name", value: `${this.name} - subnet - ${i}` }]
        });

        // Wait for it.
        subnet.addDependsOn(this.vpc);

        this.publicSubnets.push(subnet);

        // Check for null value and break if we don't have a next address.
        const tempAddress = netparser.nextNetwork(nextAddress);
        if (tempAddress != null) {
          nextAddress = tempAddress;
        } else {
          break;
        }
      }
    }
  };

  private createIGateway = (): void => {
    this.gateway = new CfnInternetGateway(this, "baws-igateway", {
      tags: [
        {
          key: "Name",
          value: `${this.name} - Internet Gateweay`
        }
      ]
    });
    // Wait for it.
    this.gateway.addDependsOn(this.vpc);

    const attach = new CfnVPCGatewayAttachment(this, "baws-igateway-attach", {
      vpcId: this.vpc.ref,
      internetGatewayId: this.gateway.ref
    });

    // Wait for it.
    attach.addDependsOn(this.vpc);
    attach.addDependsOn(this.gateway);
  };
  
  

}

// So we can easily pass the VPC created here to other processes.
interface VPCProps extends StackProps {
  config: any;
}
