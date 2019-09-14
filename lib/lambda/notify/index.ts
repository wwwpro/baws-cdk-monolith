import * as https from "https";
import { URL } from "url";
import * as AWS from "aws-sdk";

// const { slackURL, slackChannel } = process.env;

const slackURL =(typeof process.env.slackURL !== 'undefined') ? process.env.slackURL: '';
const slackChannel =(typeof process.env.slackChannel !== 'undefined') ? process.env.slackChannel: '';

const slack = new URL(slackURL);

const slackOptions: SlackOptions = {
  method: "POST"
};

const getCommitInfo = async (id: string, name: string):Promise<string> => {
  let message:string = `No commit info for commit id ${id} on ${name} repo`;

  const commit = new AWS.CodeCommit();
  const commitParams = {
    commitId: id,
    repositoryName: name
  };

  // @todo properly type this variable.
  const data:any = await commit.getCommit(commitParams).promise();
  console.log(`commit data ${JSON.stringify(data)}`);

  // message = `${data.committer.get(name)} : ${data.message}`;
  message = `${data.message}`;

  return message;
};

const assembleSlackPost = (data: any, message: string | Promise<string>, color: string): SlackPost => {
  //Assemble slack post based on results above.
  let slackPost: SlackPost = {
    channel: slackChannel,
    text: `*${data.message}*`,
    attachments: [
      {
        text: data.status,
        color: color
      }
    ]
  };

  // Add the details link, if we have it.
  if (typeof data.details !== "undefined") {
    if (typeof slackPost.attachments !== 'undefined') {
      slackPost.attachments[0].fallback = `Details: ${data.details}`;
      slackPost.attachments[0].actions = [
        {
          text: "Details",
          type: "button",
          url: data.details
        }
      ];
    }
  }
  return slackPost;
};

const sendRequest = async (slackPost: SlackPost, slackOptions: SlackOptions ) => {
  return new Promise((resolve, reject) => {
  // Send the message.
  const req = https.request(slackURL, slackOptions, res => {
    res.setEncoding("utf8");
    res.on("data", chunk => {
      console.log(`Response:  ${chunk}`);
    });
  });

  // Stuff for post method type.
  req.write(JSON.stringify(slackPost));
  req.end();
  });
};

/**
 *
 *
 * @param data
 */
exports.handler = async (data: any) => {
  let slackPost: SlackPost;
  let message: string | Promise<string>  = '';

  // The data object should be passed in a standardized format from the event
  // rule in CloudWatch, but it may be a lot of things.
  // If it's sent in from a rule, it should be in JSON format, but the object
  // will still be string. So, we try to convert it here with a try,
  // because a parse that goes wrong will bring our script to a halt.

  try {
    data = JSON.parse(data);
  } catch (e) {
    console.error(`Cannot parse JSON ${e}`);
  }

  // First, check to see if data was actually successfully converted.
  // For the intents of this script, this is the most common scenario.
  if (typeof data === "object") {
    //A message directly underneath the data object means it has -supposedly-
    // been formatted by the event rule, so we assume some structure if the first
    // test passes.
    if (typeof data.message !== "undefined") {
      console.log(`The message is ${data.message}`);
      // Set the color if it's available in the data.
      // Or, determine color based on status message.
      // Otherwise, set the color to a notification color hex.
      let color = "";
      if (typeof data.color !== "undefined") {
        color = data.color;
      } else {
        if (
          data.status.indexOf("SUCCEEDED") > -1 ||
          data.status.indexOf("SUCCESS") > -1
        ) {
          color = "good";
        } else if (
          data.status.indexOf("FAILED") > -1 ||
          data.status.indexOf("FAILURE") > -1
        ) {
          color = "danger";
        } else {
          color = "#439FE0";
        }
      }

      // Get commit info from the API, if relevant
      if (typeof data.commitId !== 'undefined') {
         message = message + await getCommitInfo(data.commitId, data.name);
        
      } else {
        message = data.message;        
      }

      slackPost = assembleSlackPost(data, message, color);

      const request = await sendRequest(slackPost, slackOptions);
      

    } else {
      //Just pretty print the content if no message is found.
      slackPost = {
        channel: slackChannel,
        text: JSON.stringify(data, null, 2)
      };
      
    }
  } else {
    // If data is just a string, just pass it along.
    slackPost = {
      channel: slackChannel,
      text: data
    };
    await sendRequest(slackPost, slackOptions);
  }
};

interface SlackPost {
  channel: string;
  text: string;
  attachments?: [
    {
      fallback?: string;
      actions?: [{
        type: string;
        text: string;
        url: string;
      }];
      text: string;
      color: string;
    }
  ];
}

interface SlackOptions {
  method: string;
}