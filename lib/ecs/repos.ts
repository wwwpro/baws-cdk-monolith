import { Construct, Stack, StackProps, ConcreteDependable } from "@aws-cdk/core";
import {Repository} from '@aws-cdk/aws-ecr';

export class BawsECR extends Stack {

    repo:Repository;

    constructor(scope:Construct, id:string, props?:StackProps) {
        super(scope, id, props);

        const repoName:string = this.node.tryGetContext('ecrRepoName');

        this.repo = new Repository(this, 'baws-ecr',{
            repositoryName: repoName,
        });
    }
}

export interface ECRProps extends StackProps {
    repos: Repository;
}