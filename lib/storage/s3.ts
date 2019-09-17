import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnBucket } from "@aws-cdk/aws-s3";
import { StringParameter } from "@aws-cdk/aws-ssm";
import uuid from "uuidv4";

export class BawsS3 extends Stack {
  assets: CfnBucket;
  artifacts: CfnBucket;
  logs: CfnBucket;

  constructor(scope: Construct, id: string, props: S3Props) {
    super(scope, id, props);

    for (let i = 0; i < props.config.length; i++) {
      const configItem = props.config[i];
      let existingUUID = "";
      let bucketName = configItem.name;

      // If unique id is set to true, it's generated.
      // but if another stack which depends on S3 is updated, we need to make
      // sure UUIDs are not generated again, lest the buckets be deleted in order
      // to be "updated".
      if (configItem.addUniquId === true) {
        try {
          const existingBucketSSM = StringParameter.valueForStringParameter(
            this,
            `string-param-lookup-${configItem.name}`,
            configItem.name
          );
          existingUUID = existingBucketSSM;
          bucketName = `${configItem.name}-${existingUUID}`
        } catch (error) {
          this.node.addInfo('No previoius bucket found. Generating new UUID');
        }

        // If we didn't fill in the blank above, create a new parameter.
        if (existingUUID !== '') {
          const bucketUUID = uuid();
          new StringParameter(this, `string-param-create-${configItem.name}`, {
            parameterName: configItem.name,
            stringValue: bucketUUID,
          });
          bucketName = `${configItem.name}-${bucketUUID.toLowerCase()}`;
        }
      }

      

      const bucket = new CfnBucket(this, `baws-bucket-${configItem.name}`, {
        bucketName
      });

      if (configItem.type == "assets" && this.assets !== null) {
        this.assets = bucket;
      }
      if (configItem.type == "artifacts" && this.artifacts !== null) {
        this.artifacts = bucket;
      }
      if (configItem.type == "logs" && this.logs !== null) {
        this.logs = bucket;
      }
    }

    if (this.assets === null || this.artifacts === null || this.logs === null) {
      this.node.addError(
        "One of each bucket type must be created: assets, artifacts and logs."
      );
    }
  }
}

interface S3Props extends StackProps {
  config: any[];
}
