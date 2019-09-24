#!/usr/bin/env node
import "source-map-support/register";
import { App } from "@aws-cdk/core";
import { BawsVPC } from "../lib/vpc/cnfvpc";
import { BawsRouteResource } from "../lib/vpc/routeResource";
import { BawsScaling } from "../lib/servers/auto-scaling";
import { BawsCluster } from "../lib/ecs/cluster";
import { BawsEFS } from "../lib/storage/efs";
import { BawsTasks } from "../lib/ecs/tasks";
import { BawsALB } from "../lib/servers/alb";
import { BawsSecurity } from "../lib/security/security-groups";
import { BawsECR } from "../lib/ecs/ecr";
import { BawsTemplate } from "../lib/servers/launch-template";
import { BawsCommit } from "../lib/codepipeline/commit";
import { BawsRoles } from "../lib/security/roles";
import { BawsPipelines } from "../lib/codepipeline/pipelines";
import { BawsRDS } from "../lib/database/aurora";
import { BawsServices } from "../lib/ecs/services";
import { BawsCache } from "../lib/cache/cache";
import { BawsCDN } from "../lib/cdn/cdn";
import { BawsS3 } from "../lib/storage/s3";
import { BawsNotifyFunction } from "../lib/lambda/notifications";
import { BawsEvents } from "../lib/cloudwatch/events";

import { YamlConfig } from "../lib/baws/yaml-dir";

let config: any;
const app = new App();

// Get our default region and account.
// This will be altered by the usage of the "profile" flag
// For instance `cdk deploy stack-full --profile profileName`
// However, if you're using a variety of profiles on the same machine,
// The general recommendation is to hard code the values below.
const defaultEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

// Load our configuration file.
config = YamlConfig.getConfigFile("config.yml");

// The foundation. We always need this.
const vpc = new BawsVPC(app, "vpc", {
  env: defaultEnv,
  config: config.vpc
});

// We currently have a no way to access the main route table through CloudFormation, so we
// need this custom resource.
const routeResource = new BawsRouteResource(app, "route-resource", {
  env: defaultEnv,
  vpcId: vpc.vpcId
});
routeResource.addDependency(vpc);

// Security creates groups for everything else we create.
// If more groups are needed, add them here.
const security = new BawsSecurity(app, "security", {
  env: defaultEnv,
  vpcId: vpc.vpcId
});
security.addDependency(routeResource);

// Roles which can rely on AWS managed roles are added here.
// Other roles which rely on service Arns are added in their respective stacks.
const roles = new BawsRoles(app, "roles", {
  env: defaultEnv
});

// Artifacts, asset and logging buckets.
// Every service which relies on a bucket for assets, logs or artifacts are created here.
const s3 = new BawsS3(app, "s3", {
  env: defaultEnv,
  config: config.s3.buckets
});

// EFS. This is optional, but recommended. Remove efsId from `launchTemplate` if removed.
const efs = new BawsEFS(app, "efs", {
  env: defaultEnv,
  vpcId: vpc.vpcId,
  publicSubnets: vpc.publicSubnets,
  securityGroup: security.ec2,
  encrypted: config.efs.encrypted,
  name: config.efs.name
});
efs.addDependency(vpc);
efs.addDependency(security);

// Create our ECS cluster, so our launch template knows where its instances belong.
const cluster = new BawsCluster(app, "cluster", {
  env: defaultEnv,
  clusterName: config.ecs.clusterName
});

// The autoscaling group will use this template to deploy instances.
// If any updates are made to the launch template, be sure to update
// the `scaling` stack as well.
const launchTemplate = new BawsTemplate(app, "launch-template", {
  env: defaultEnv,
  ec2SecurityGroup: security.ec2.ref,
  instanceRole: roles.ec2InstanceRef,
  vpcId: vpc.vpcId,
  efsId: efs.efsId,
  clusterName: cluster.clusterName,
  config: config.launchTemplates
});
launchTemplate.addDependency(cluster);
launchTemplate.addDependency(security);
launchTemplate.addDependency(efs);

// The load balancer. A base target group is created in this process.
// Additional target groups are created for each service, under `services`
const alb = new BawsALB(app, "alb", {
  env: defaultEnv,
  vpcId: vpc.vpcId,
  publicSubnets: vpc.publicSubnets,
  securityGroup: security.alb,
  albName: config.alb.name
});
alb.addDependency(routeResource);


// Each one of our pipelines needs a repo, created here.
// Github support is on the roadmap.
const commit = new BawsCommit(app, "commit", {
  env: defaultEnv,
  config: config.codeCommitRepos
});

// Creates an aurora cluster to be configured in config.yml.
// Part of the `stack-full` and `stack-standard`
const rds = new BawsRDS(app, "rds", {
  env: defaultEnv,
  config: config.rds,
  publicSubnets: vpc.publicSubnets,
  securityGroup: security.rds
});
rds.addDependency(vpc);
rds.addDependency(security);

// Creates either a redis or memcached cluster, according to
// config.yml. Only part of the `stack-full` stack.
const cache = new BawsCache(app, "cache", {
  env: defaultEnv,
  config: config.cache.clusters,
  securityGroup: security.cache,
  publicSubnets: vpc.publicSubnets
});
cache.addDependency(vpc);
cache.addDependency(security);

// Create the repos which will be used for our tasks.
const ecr = new BawsECR(app, "ecr", {
  env: defaultEnv,
  config: config.ecs,
  configDir: config.ecs.tasksDir
});

// Creates tasks which are used by services.
// Each service needs a task.
const tasks = new BawsTasks(app, "tasks", {
  env: defaultEnv,
  config: config.ecs.tasks,
  executionRole: roles.ecsExecution,
  taskRole: roles.ecsTask,
  configDir: config.ecs.tasksDir
});
tasks.addDependency(roles);
tasks.addDependency(ecr);

// Effectively the "app" which gets deployed to the servers
// created in by the scaling stack.
const services = new BawsServices(app, "services", {
  env: defaultEnv,
  config: config.ecs.services,
  configDir: config.ecs.configDir,
  listener: alb.listener,
  albName: alb.albName,
  clusterName: cluster.clusterName,
  executionRole: roles.ecsExecution,
  taskRole: roles.ecsTask,
  vpcId: vpc.vpcId
});
services.addDependency(cluster);
services.addDependency(tasks);
services.addDependency(alb);

// Our autoscaling group for cluster instances.
// Adjust settings in config.yml.
const scaling = new BawsScaling(app, "scaling", {
  env: defaultEnv,
  vpcId: vpc.vpcId,
  efsId: efs.efsId,
  targetArns: services.targetRefs,
  ec2SecurityGroup: security.ec2.ref,
  instanceRole: roles.ec2InstanceRef,
  clusterName: cluster.clusterName,
  publicSubnets: vpc.publicSubnets,
  config: config.scaling,
});
scaling.addDependency(security);
scaling.addDependency(efs);


// Pipelines make sure we have a mechanism for deploying apps from a repo.
const pipelines = new BawsPipelines(app, "pipelines", {
  env: defaultEnv,
  taskMap: tasks.taskMap,
  configDir: config.pipeline.configDir,
  clusterName: cluster.clusterName,
  bucket: s3.artifacts,
  pipelineRole: roles.pipeline,
  buildRole: roles.build,
  config: config.pipeline
});
pipelines.addDependency(roles);
pipelines.addDependency(commit);
pipelines.addDependency(services);
pipelines.addDependency(s3);

// Optional, but recommended. Not part of any stack.
// Ideally, under the "monolith" model for which this is designed,
//  one cdn stack per service would be created.
const cdn = new BawsCDN(app, "cdn", {
  env: defaultEnv,
  albDns: alb.dnsName,
  config: config.cdn.distributions,
  assetBucket: s3.assets
});
cdn.addDependency(alb);
cdn.addDependency(s3);

// The lambda function which handles the delivery of notilfications on events.
const notify = new BawsNotifyFunction(app, "notifications", {
  env: defaultEnv,
  config: config.notifications
});

// The CloudWatch Rules which transform and send relevant info to the notify function.
const events = new BawsEvents(app, "events", {
  env: defaultEnv,
  lambdaTargetArn: notify.function.functionArn
});
events.addDependency(notify);

/**
 * Begin easily deployable stacks.
 * These stacks may be deployed using their stack names, but deleting them will not
 * delete the entire stack. Dependencies are uni-directional.
 * For instnace, running `cdk destroy stack-standard` will not delete the alb, rds, services,
 * or other resources created in order to create the stack. Each service must be deleted individually.
 * See your CloudFormation console to get a comprehensive list of resources running.
 */

const full = new BawsPipelines(app, "stack-full", {
  env: defaultEnv,
  clusterName: cluster.clusterName,
  configDir: config.pipeline.configDir,
  taskMap: tasks.taskMap,
  bucket: s3.artifacts,
  pipelineRole: roles.pipeline,
  buildRole: roles.build,
  config: config.pipeline
});
full.addDependency(services);
full.addDependency(commit);
full.addDependency(cache);
full.addDependency(rds);

const standard = new BawsPipelines(app, "stack-standard", {
  env: defaultEnv,
  clusterName: cluster.clusterName,
  configDir: config.pipeline.configDir,
  taskMap: tasks.taskMap,
  bucket: s3.artifacts,
  pipelineRole: roles.pipeline,
  buildRole: roles.build,
  config: config.pipeline
});
standard.addDependency(services);
standard.addDependency(commit);
standard.addDependency(rds);

const min = new BawsPipelines(app, "stack-min", {
  env: defaultEnv,
  clusterName: cluster.clusterName,
  configDir: config.pipeline.configDir,
  taskMap: tasks.taskMap,
  bucket: s3.artifacts,
  pipelineRole: roles.pipeline,
  buildRole: roles.build,
  config: config.pipeline
});
min.addDependency(services);
min.addDependency(commit);

/*
const trigger = new BawsEventTrigger(app, 'trigger', {
  lambdaFunctionArn: notify.function.functionArn,
  ruleArn: events.
});
*/
