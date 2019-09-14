import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnRepository } from "@aws-cdk/aws-codecommit";
import { CfnLaunchConfiguration } from "@aws-cdk/aws-autoscaling";

export class BawsCommit extends Stack {
  repo: CfnRepository;

  constructor(scope: Construct, id: string, props: CommitProps) {
    super(scope, id, props);

    for (let i = 0; i < props.config.length; i++) {
      // Use the id as the repo name if not designated in props;
      const config = props.config[i];
      if (typeof config.name !== 'undefined' ) {
        const repositoryName =
          typeof config.name !== "undefined" ? config.name : id;

        const repositoryDescription =
          typeof config.description !== "undefined"
            ? config.description
            : "Created by baws cdk.";

        this.repo = new CfnRepository(this, `baws-repo-${repositoryName}`, {
          repositoryName,
          repositoryDescription
        });
      }else {
        this.node.addError('codeCommitRepo is missing name property.');
      }
    }
  }
}

// Allow custom name and description in entry file.
export interface CommitProps extends StackProps {
  config: any[];
}
