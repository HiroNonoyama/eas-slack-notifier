const crypto = require("crypto");
const express = require("express");
const bodyParser = require("body-parser");
const safeCompare = require("safe-compare");
const axios = require("axios");
const functions = require("@google-cloud/functions-framework");

const getBuildMessage = ({
  id,
  appId,
  projectName,
  status,
  artifacts,
  metadata,
  platform,
  error,
  buildDetailsPageUrl,
}) => {
  const title = `*Build ${status} on ${projectName}*`;
  let text = `Build ID: ${id}`;
  text += `\nApp ID: ${appId}`;
  text += `\nPlatform: ${platform}`;
  text += `\nChannel: ${metadata.channel}`;
  text += `\nApp Version: ${metadata.appVersion}`;
  if (error) {
    text += `\nError: ${error.message}`;
  } else {
    text += `\nArtifact: ${artifacts.buildUrl || "No artifact"}`;
    text += `\nBuild Detail Page: ${buildDetailsPageUrl}`;
  }
  return { title, text };
};

const getSubmitMessage = ({ id, projectName, submissionDetailsPageUrl, appId, archiveUrl, platform, status, submissionInfo }) => {
  const title = `*Submission ${status} on ${projectName}*`
  let text = `Submission ID: ${id}`
  text += `\nApp ID: ${appId}`
  text += `\nPlatform: ${platform}`
  text += `\nArchive: ${archiveUrl}`
  text += `\nSubmission Detail Page: ${submissionDetailsPageUrl}`
  if (status === "errored") {
    text += `\nError: ${submissionInfo.error.message}`
  } else {
    text += `\nLogs: ${submissionInfo.logsUrl}`
  }
  return { title, text }
}

const getColor = (status) => {
  switch (status) {
    case "canceled":
      return "warning";
    case "errored":
      return "danger";
    case "finished":
    default:
      return "good";
  }
};

const validateRequest = (req) => {
  const expoSignature = req.headers['expo-signature'];
  const hmac = crypto.createHmac('sha1', process.env.SECRET_WEBHOOK_KEY);
  hmac.update(req.body);
  const hash = `sha1=${hmac.digest('hex')}`;
  return safeCompare(expoSignature, hash);
};

const app = express();
app.use(bodyParser.json());
app.post("/build", async (req, res) => {
  if (!validateRequest(req)) {
    res.status(500).send("Signatures didn't match!");
    return;
  }

  const { title, text } = getBuildMessage(req.body);
  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      channel: "#4-productdev_software",
      text: title,
      attachments: [
        {
          color: getColor(req.body.status),
          text,
        },
      ],
    });
    res.send("OK!");
  } catch (error) {
    console.error("Error sending message:", error.message);
  }
});
app.post("/submit", async (req, res) => {
  if (!validateRequest(req)) {
    res.status(500).send("Signatures didn't match!");
    return;
  }

  const { title, text } = getSubmitMessage(req.body);
  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      channel: "#4-productdev_software",
      text: title,
      attachments: [
        {
          color: getColor(req.body.status),
          text,
        },
      ],
    });
    res.send("OK!");
  } catch (error) {
    console.error("Error sending message:", error.message);
  }
});

functions.http("notify_eas", app);