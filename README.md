# Baws "Monolith" CDK - Beta
Use CDK command line to build and manage complete infrastructure needed to containerize and modernize your monolith applications such as WordPress, Drupal, Flask, Django, any static site generator with Docker and CodePipelines

This is currently an alpha build. More documentation and features arriving by October, 2019.


## Getting Started
---

### **Important Note:**
Although usage of this code is free, following instructions here will result in billable services in your AWS account. 

**You are responsbile for your AWS bill.**

## Prerequisites:

* Of course, you'll need [an AWS Account](https://aws.amazon.com/)
* Install the [AWS Cli](https://docs.aws.amazon.com/en_pv/cli/latest/userguide/cli-chap-install.html)
* Create an IAM User, with "Power User" permissions
* Setup the IAM with the AWS CLI.
* Create at least one SSL cert managed through [Certification Manager](https://console.aws.amazon.com/acm/home).
* Install [Node.js](https://nodejs.org/en/download/)

## Setup
---
1. Clone repo to local environment.
2. Run `npm i -g aws-cdk`
3. Run `npm install`
4. Copy `.cdk.json` into a new file called `cdk.json`.
5. Copy `config.sample.yml` to `config.yml`
6. Follow configuration steps below

### **Configure cdk.json**

_bastionIps_: (Optional) An array of IPs you'd like to be allowed to access EC2 instances.

_SSLCertArn_: (Required)T he Arn of the default SSL certificate you'd like to be added 

_ec2Key_: Create (or upload) and SSH key to [Key Pairs](https://console.aws.amazon.com/ec2/home#KeyPairs:sort=keyName) in the AWS console. 

### **Configure.yml**
Config.yml can be used to configure and update your infrastructure. Every variable option within this package can and should be updated here. Every array can be duplicated to create additional infrastructure. For instance, additional ECS clusters, additional tasks, additional pipelines, etc. can be created by duplicating the array. 

All `name` options must be unique per array.

Most options are commented or self-explanatory. Additional documentation will be arriving by October, 2019.

## Usage
---

After setup above, build the code locally:

```bash
npm run build
```

Then run the following command:

```bash
cdk bootstrap
```
After the bootstrap command is run, you have the option of 3 different stacks:

## Creating your Stacks

```bash
cdk deploy stack-full
```
The above will launch all standard features, and launch an Aurora Cluster, and a Cache Cluster.

```bash
cdk deploy stack-standard
```
The above will launch all standard features for a CRUD application. It is missing elasticache when compared to `stack-full`.

```bash
cdk deploy stack-min
```
The above will not launch an Aurora (MySQL) cluster, or a cache cluster, compared to `stack-full` and `stack-standard`, respectively.  

## Destroying your Stacks

Each stack you create above is compiled from a serires of separate stacks. This is by design, in order to be able to destroy a service, for instance, without destroying its corresponding repo. 

To view all stacks created by the services visit the [CloudFormation Service](https://console.aws.amazon.com/cloudformation/home?#/stacks?filteringText=&filteringStatus=active&viewNested=true&hideStacks=false) in your console. 

Destroying a stack will also destroy all service dependent on that stack. For instance, nearly every service is dependent on the `vpc` stack. To destroy everything created by the above deploy commands, run:

```bash
cdk destroy vpc
```
**PLEASE NOTE:** After populating storage and services with content, not every stack will destroy successfully. For instance, non-empty S3 buckets cannot be destroyed through command line; the destroy command will fail. 

To destroy any stacks which fail to delete, you may have to take manual action, such as deleting the desired S3 buckets through the console, first. 

## Road Map
---
The following features have the highest priority in future implementation:

* **Blue/Green Deployment option in the pipeline.**
* **Granular scaling options for services**
* **Better scaling options for the `scaling` stack**
* **Github support in pipelines.**
* **"Files" support** for S3, CDN and Pipeline configs, similar to ECS, so yml files can be read from a directory instead of needing to be in the main config.  
* **Fargate Stack** for deploying common utilities, such as PhpMyAdmin.

## Contact 
---
wwwpro@baws.io