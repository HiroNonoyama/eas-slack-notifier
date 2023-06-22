const crypto = require('crypto');
const express = require('express')
const bodyParser = require('body-parser');
const safeCompare = require('safe-compare');
const axios = require('axios');
const functions = require('@google-cloud/functions-framework');

const app = express();
app.use(bodyParser.text({ type: '*/*' }));
app.post('/webhook', async (req, res) => {
  const expoSignature = req.headers['expo-signature'];
  const hmac = crypto.createHmac('sha1', process.env.SECRET_WEBHOOK_KEY);
  hmac.update(req.body);
  const hash = `sha1=${hmac.digest('hex')}`;
  if (!safeCompare(expoSignature, hash)) {
    res.status(500).send("Signatures didn't match!");
  } else {
    
    const { id, appId, status, artifacts, metadata, platform, error, buildDetailsPageUrl } = JSON.parse(req.body);
    const text = `*Build ${id} for ${appId} ${status}*
    Platform: ${platform}
    Channel: ${metadata.channel}
    App Version: ${metadata.appVersion}
    ${
      error
      ? `Error: ${error.message}`
      : `Artifact: ${artifacts.buildUrl}\nBuild Detail Page: ${buildDetailsPageUrl}`}
    `;
    try {
      const response = await axios.post(SLACK_WEBHOOK_URL, { channel: '#4-productdev_software', text })
      console.log('Message sent: ', response.data)
    } catch (error) {
      console.log('Error sending message:', error.message);
    }
    res.send('OK!');
  }
});


functions.http('notify_eas_build', app);
