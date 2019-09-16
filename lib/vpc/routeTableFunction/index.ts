"use strict";
import * as AWS from "aws-sdk";
import * as response from 'cfn-response';
import { ConfigurationServicePlaceholders } from "aws-sdk/lib/config_service_placeholders";

exports.handler = async (event: any, context:any) => {
  console.log(`EVENT REQUEST: ${JSON.stringify(event)}`);
  const vpcId = event.ResourceProperties.Vpcid;
  let attributes = {
    'Response': ''
  };

  // If we have a VPC, get the main route table, then alter that route table
  // to allow internet traffic. 
  // There is currently no way to alter the maain route table through CloudFormation,
  // and by extension the cdk, directly. 
  if (typeof vpcId !== "undefined" && event.RequestType == 'Create') {

    const ec2 = new AWS.EC2();
    const RouteTables = {
      Filters: [
        {
          Name: "vpc-id",
          Values: [vpcId]
        },
        {
          Name: "association.main",
          Values: ["true"]
        }
      ]
    };

    const InternetGateways = {
      Filters: [
        {
          Name: "attachment.vpc-id",
          Values: [vpcId]
        }
      ]
    };

    const tables = await ec2.describeRouteTables(RouteTables).promise();
    const RouteTableId =
      typeof tables.RouteTables !== "undefined" &&
      typeof tables.RouteTables[0].RouteTableId !== "undefined"
        ? tables.RouteTables[0].RouteTableId
        : "";

    const iGateway = await ec2
      .describeInternetGateways(InternetGateways)
      .promise();

    const GatewayId =
      typeof iGateway.InternetGateways !== "undefined"
        ? iGateway.InternetGateways[0].InternetGatewayId
        : "";

    const RouteParams = {
      DestinationCidrBlock: "0.0.0.0/0",
      RouteTableId,
      GatewayId
    };

    const route = await ec2.createRoute(RouteParams).promise();
    attributes.Response = `Created internet route for table ${RouteTableId}`;
    console.log(attributes.Response);
  }

  const sendCFNRequest = new Promise((resolve, reject) => {
    try {
      response.send(event, context, response.SUCCESS, attributes, event.PhysicalResourceId);
      console.log('Sent response success');
    } catch (error) {
      response.send(event, context, response.FAILED, attributes, event.PhysicalResourceId);
      console.log(`Response error ${error}`);
    }
  });

  await sendCFNRequest;
  
};