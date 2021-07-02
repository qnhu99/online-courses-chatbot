import dotenv from 'dotenv';
import request from "request";
import chatbotService from '../services/chatbot.service';

dotenv.config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

//process.env.NAME_VARIABLES
export function getHomePage(req, res) {
    return res.render('homepage.ejs');
};

export function postWebhook(req, res) {
    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);


            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
}

export function getWebhook(req, res) {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
}

// Handles messages events
function handleMessage(sender_psid, received_message) {

    let response;

    // Checks if the message contains text
    if (received_message.text) {
        // Create the payload for a basic text message, which
        // will be added to the body of our request to the Send API
        let text = received_message.text.trim();
        let startsWith = text.substring(0, 7);

        if (startsWith.toLowerCase() === "search:") {
            let searchKeyWords = text.substring(7).trim();

            // response = {
            //     "text": `Bạn muốn search cho từ khóa "${searchKeyWords}"?`,
            //     "quick_replies": [
            //         {
            //             "content_type": "text",
            //             "title": "Yes",
            //             "payload": "SEARCH_YES",
            //         }, {
            //             "content_type": "text",
            //             "title": "No",
            //             "payload": "SEARCH_NO",
            //         }
            //     ]
            // }

            response = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [
                            {
                                "title": "Course 1",
                                "image_url": "https://www.classcentral.com/report/wp-content/uploads/2020/06/top-100-course-pandemic.png",
                                "subtitle": "Officia amet nostrud laborum reprehenderit deserunt fugiat labore aliquip officia quis excepteur minim incididunt ex.",
                                "default_action": {
                                    "type": "web_url",
                                    "url": "https://petersfancybrownhats.com/view?item=103",
                                    "webview_height_ratio": "tall",
                                },
                                "buttons": [
                                    {
                                        "type": "web_url",
                                        "url": "https://petersfancybrownhats.com",
                                        "title": "View Website"
                                    }, {
                                        "type": "postback",
                                        "title": "Start Chatting",
                                        "payload": "DEVELOPER_DEFINED_PAYLOAD"
                                    }
                                ]
                            },
                            {
                                "title": "Est dolore ut et velit.",
                                "image_url": "https://www.classcentral.com/report/wp-content/uploads/2020/06/top-100-course-pandemic.png",
                                "subtitle": "Minim anim reprehenderit Lorem occaecat.",
                                "default_action": {
                                    "type": "web_url",
                                    "url": "https://petersfancybrownhats.com/view?item=103",
                                    "webview_height_ratio": "tall",
                                },
                                "buttons": [
                                    {
                                        "type": "web_url",
                                        "url": "https://petersfancybrownhats.com",
                                        "title": "View Website"
                                    }, {
                                        "type": "postback",
                                        "title": "Start Chatting",
                                        "payload": "DEVELOPER_DEFINED_PAYLOAD"
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        } else {
            response = {
                "text": `You just send me "${received_message.text}". But I don't know what to do.`
            }
        }

    } else if (received_message.attachments) {
        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        }
    }

    // Send the response message
    callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
async function handlePostback(sender_psid, received_postback) {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    switch (payload) {
        case 'yes':
            response = { "text": "Thanks!" }
            break;
        case 'no':
            response = { "text": "Oops, try sending another image." }
            break;
        case 'GET_STARTED':
        case 'RESTART_BOT':
            response = await chatbotService.handleGetStarted(sender_psid, response);
            return;
        case 'FIND_COURSE':
            response = { text: `Bạn vui lòng nhập từ khóa muốn tìm theo dạng:\nsearch: <Từ khóa>` };
            break;
        default:
            response = { text: `Mình chưa biết phản hồi lệnh '${payload}' này của bạn 😭😭😭.` };
            break;
    }

    // Send the message to acknowledge the postback
    chatbotService.callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}

export async function setupProfile(req, res) {
    const request_body = {
        "get_started": { payload: "GET_STARTED" },
        "whitelisted_domains": ["https://online-courses-chatbot.herokuapp.com/"],
        "persistent_menu": [
            {
                "locale": "default",
                "composer_input_disabled": false,
                "call_to_actions": [
                    {
                        "type": "web_url",
                        "title": "Visit website",
                        "url": "https://www.originalcoastclothing.com/",
                        "webview_height_ratio": "full"
                    },
                    {
                        "type": "postback",
                        "title": "Restart bot",
                        "payload": "RESTART_BOT"
                    }
                ]
            }
        ]
    };

    request({
        "uri": `https://graph.facebook.com/v11.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, noNeedRes, body) => {
        res.send(body);
        if (!err) {
            console.log(">> ~ file: HomeController.js ~ line 175 ~ setupProfile ~ body", body);
            console.log('Setup FB user profile SUCCESS');
        } else {
            console.error("Setup FB user profile FAIL:" + err);
        }
    });
}
