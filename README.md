# Baws "Monolith" CDK - Beta
Use CDK command line to build and manage complete infrastructure needed to containerize and modernize your monolith applications into  such as WordPress, Drupal, Flask, Django, any static site generator with Docker and CodePipelines

This is currently an alpha build. More documentation and features arriving by October, 2019.

---

## Getting Started

### **Important Note:**
Although usage of this code is free, following instructions here will result in billable services in your AWS account. **You are responsbile for your AWS bill.**

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