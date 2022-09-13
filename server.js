const express = require('express');
const bodyParser = require('body-parser');
const favicon = require('express-favicon');
const path = require('path');
const cors = require('cors');
const toSlugCase = require('to-slug-case');

const port = process.env.PORT || 8080;
const app = express();
const { App } = require("@slack/bolt");

const slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});


const BoxSDK = require('box-node-sdk');
let sdk;
if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') {
    sdk = BoxSDK.getPreconfiguredInstance(JSON.parse(process.env.BOX_CONFIG));
}
else {
    require('dotenv').config();
    sdk = BoxSDK.getPreconfiguredInstance(JSON.parse(process.env.BOX_CONFIG));
}
const client = sdk.getAppAuthClient('enterprise');

const { EXPLORER_SCOPES, RECENTS_SCOPES, PICKER_SCOPES, UPLOADER_SCOPES, PREVIEW_SCOPES } = require('./server-constants');

const decode = require("salesforce-signed-request");
const signedRequestConsumerSecret = process.env.SIGNED_REQUEST_CONSUMER_SECRET;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: [
      `https://${process.env.REACT_APP_NAME}.herokuapp.com`, 
      `https://${process.env.SALESFORCE_DOMAIN}.my.salesforce.com`, 
      'http://localhost:8080'
    ]
}));
app.use(favicon(__dirname + '/build/favicon.ico'));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'build')));

let signedRequest;

app.post("/signedrequest", async (req, res) => {
  
  try {

    signedRequest = decode(req.body.signed_request, signedRequestConsumerSecret);      
    const context = signedRequest.context;
    console.log('Found context: ', context);

    const oauthToken = signedRequest.client.oauthToken;
    console.log('Found oauth token: ', oauthToken);

    const instanceUrl = signedRequest.client.instanceUrl;
    console.log('Found instance url: ', instanceUrl);

    const parameters = context.environment.parameters;
    console.log("Found params: ", parameters);
    console.log("Element Type: ", parameters.elementType);
    const uiElement = parameters.elementType;
    
    let folderId;
    switch(uiElement) {
        case "explorer":
            folderId = parameters.folderId;
            res.redirect(301, `/explorer/${folderId}`);
            break;
        case "recents":
            const userId = parameters.userId;
            res.redirect(301, `/recents/${userId}`);
            break;
        case "picker":
            folderId = parameters.folderId;
            const recordName = parameters.recordName;
            const userFullName = context.user.fullName;

            res.redirect(301, `/picker?folderId=${folderId}
                &recordName=${recordName}
                &userFullName=${userFullName}`);
            break;
        case "uploader":
            folderId = parameters.folderId;
            res.redirect(301, `/uploader/${folderId}`);
            break;
        case "preview":
            const fileId = parameters.fileId;
            res.redirect(301, `/preview/${fileId}`);
            break;
        case "metadata":
            folderId = parameters.folderId;
            const boxEnterpriseId = parameters.boxEnterpriseId;
            const boxMdTemplateKey = parameters.boxMdTemplateKey;
            const boxMdQueryFieldKey = parameters.boxMdQueryFieldKey;
            const boxMdQueryOperator = parameters.boxMdQueryOperator;
            const salesforceField = parameters.salesforceField;
            const boxMdColumnFieldKeys = parameters.boxMdColumnFieldKeys;
   
            res.redirect(301, `/metadata?folderId=${folderId}
                &boxEnterpriseId=${boxEnterpriseId}
                &boxMdTemplateKey=${boxMdTemplateKey}
                &boxMdQueryFieldKey=${boxMdQueryFieldKey}
                &boxMdQueryOperator=${boxMdQueryOperator}
                &salesforceField=${salesforceField}
                &boxMdColumnFieldKeys=${boxMdColumnFieldKeys}`);
            break;
        default:
            res.redirect(301, '/explorer/0');
    }
  }
  catch(error) {
      console.log('Failed to get UI Element: ', error);
      res.status(500).send({ error: error.message });
  }
});

app.get('/signedrequest', async (req, res) => {
    try {
        console.log('GET signed request: ', signedRequest);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(signedRequest);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.message });
    }
})

app.post('/box/shared/links', async (req, res) => {
    try {
        const channelsResult = await slackApp.client.conversations.list();
        const channelName = req.body.recordName;
        console.log('Found channel name: ', channelName);

        let slugCaseChannelName = toSlugCase(channelName) + '-external';
        console.log('Slug case name: ', slugCaseChannelName);

        let channelId;
        for (const channel of channelsResult.channels) {
            if (channel.name === slugCaseChannelName) {
                channelId = channel.id;
        
                console.log(`Found a matching channel ID: ${channelId} and name: ${slugCaseChannelName}`);
                break;
            }
        }
        const items = req.body.items;
        let slackMessageText = "*:boxlogo: John just shared the the following files with you. Check them out!*"
        for(const item of items) {
            console.log(`Found item with id: ${item.id}, name: ${item.name}, extension: ${item.extension}, and shared link: ${item.shared_link.url}`);
            slackMessageText = slackMessageText + `\n:${item.extension}:  <${item.shared_link.url}|${item.name}> \n`
        }
        let slackBlocks = [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": slackMessageText
            }
        }];

        console.log('Found slack block: ', JSON.stringify(slackBlocks, null, 2));

        if(channelId) {
            const slackMessageResult = await slackApp.client.chat.postMessage({
                channel: channelId,
                blocks: slackBlocks
            });
            console.log('Found post message result: ', JSON.stringify(slackMessageResult, null, 2));
        } else {
            console.log('No channel found for channel name: ', slugCaseChannelName);
        }

        
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send();
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.message });
    }
})

app.get('/box/explorer/token-downscope/:folderId', async (req, res) => {
    try {
        const folderId = req.params.folderId;     
        const downscopedToken = await client.exchangeToken(EXPLORER_SCOPES, `https://api.box.com/2.0/folders/${folderId}`);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.message });
    }
})

app.get('/box/metadata/token-downscope', async (req, res) => {
    try {
        const downscopedToken = await client.exchangeToken(EXPLORER_SCOPES);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.message });
    }
})


app.get('/box/explorer-recents/token-downscope/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const userClient = sdk.getAppAuthClient('user', userId);
        const downscopedToken = await userClient.exchangeToken(RECENTS_SCOPES)

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.message });
    }
})

app.get('/box/picker/token-downscope/:folderId', async (req, res) => {
    try {
        const folderId = req.params.folderId;
        const templateKey = req.body.templateKey;

        const from = 'enterprise_12345.someTemplate',
        ancestorFolderId = '0',
        options = {
            query: 'amount >= :arg',
            query_params: {
                arg: 100
            },
            order_by: [
                {
                    field_key: 'amount',
                    direction: 'asc'
                }
            ],
        };
        client.metadata.query(from, ancestorFolderId, options)
        .then(items => {
            
        });


        const downscopedToken = await client.exchangeToken(PICKER_SCOPES, `https://api.box.com/2.0/folders/${folderId}`);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.message });
    }
})

app.get('/box/uploader/token-downscope/:folderId', async (req, res) => {
    try {
        const folderId = req.params.folderId;
        const downscopedToken = await client.exchangeToken(UPLOADER_SCOPES, `https://api.box.com/2.0/folders/${folderId}`);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.message });
    }
})

app.get('/box/preview/token-downscope/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const downscopedToken = await client.exchangeToken(PREVIEW_SCOPES, `https://api.box.com/2.0/files/${fileId}`);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.message });
    }
})

app.listen(port);

   
app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

(async () => {
    // Start your app
    await slackApp.start(8081);
  
    console.log('⚡️ Box Slack Bolt app is running!');
  })();