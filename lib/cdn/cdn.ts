import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  CfnDistribution,
  CfnCloudFrontOriginAccessIdentity
} from "@aws-cdk/aws-cloudfront";
import { CfnBucket } from "@aws-cdk/aws-s3";
import { type } from "os";

export class BawsCDN extends Stack {
  distributions: CfnDistribution[];

  constructor(scope: Construct, id: string, props: CDNProps) {
    super(scope, id, props);

    const config: any[] = props.config;

    for (let i = 0; i < config.length; i++) {
      const configItem = config[i];

      const originAccessIdentity = new CfnCloudFrontOriginAccessIdentity(
        this,
        `baws-cf-identity-${configItem.name}`,
        {
          cloudFrontOriginAccessIdentityConfig: {
            comment: "Created by baws."
          }
        }
      );

      const targetOriginId = "baws-alb";

      // @todo flesh out custom origins.
      const origins: CfnDistribution.OriginProperty[] = [
        {
          domainName: props.albDns,
          id: targetOriginId,
          customOriginConfig: {
            originProtocolPolicy: "match-viewer",
            httpPort: 80,
            httpsPort: 443
          }
        },
        {
          domainName: props.assetBucket.attrDomainName,
          id: "baws-s3-asset-bucket",
          s3OriginConfig: {
            originAccessIdentity: `origin-access-identity/cloudfront/${originAccessIdentity.ref}`
          }
        }
      ];

      let allowedMethods = ["GET", "HEAD"];
      if (configItem.enablePostRequests) {
        allowedMethods = [
          ...allowedMethods,
          "OPTIONS",
          "PUT",
          "POST",
          "PATCH",
          "DELETE"
        ];
      }

      const viewerProtocolPolicy =
        typeof configItem.certificateArn !== "undefined"
          ? "redirect-to-https"
          : "allow-all";

      let distributionConfig: CfnDistribution.DistributionConfigProperty = {
        comment: "Created by Baws CDK",
        enabled: true,
        aliases: configItem.cnames,
        httpVersion: "http2",
        origins,
        priceClass: configItem.priceClass,
        defaultCacheBehavior: {
          targetOriginId,
          allowedMethods,
          viewerProtocolPolicy: "redirect-to-https",
          minTtl: 600,
          maxTtl: 31536000,
          defaultTtl: 86400,
          compress: true,
          forwardedValues: {
            cookies: {
              forward: "all"
            },
            headers: ["Accept", "Host", "Origin", "Referer"],
            queryString: true
          }
        }
      };

      if (typeof configItem.certificateArn !== "undefined") {
        distributionConfig = this.addSSLArn(distributionConfig, configItem);
      }

      this.node.addInfo(
        `Final distribution config: ${JSON.stringify(distributionConfig)}`
      );
      const distribution = new CfnDistribution(
        this,
        `baws-cdn-${configItem.name}`,
        {
          distributionConfig
        }
      );
    }
  }

  private addSSLArn = (
    originalProperty: CfnDistribution.DistributionConfigProperty,
    configItem: any
  ): CfnDistribution.DistributionConfigProperty => {
    const certArn = configItem.certificateArn;

    const viewerCertificate: CfnDistribution.ViewerCertificateProperty = {
      acmCertificateArn: certArn,
      sslSupportMethod: "sni-only"
    };

    const newProperty: CfnDistribution.DistributionConfigProperty = {
      ...originalProperty,
      viewerCertificate
    };

    return newProperty;
  };
}

interface CDNProps extends StackProps {
  config: any[];
  albDns: string;
  assetBucket: CfnBucket;
}
