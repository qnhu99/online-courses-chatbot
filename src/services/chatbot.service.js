import dotenv from 'dotenv';
import request from "request";

dotenv.config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

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

function getPersonProfile(sender_psid) {
    //https://graph.facebook.com/<PSID>?fields=first_name,last_name,profile_pic&access_token=<PAGE_ACCESS_TOKEN>
    return new Promise(async (resolve) => {
        request({
            uri: `https://graph.facebook.com/${sender_psid}?fields=first_name,last_name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`,
            "method": "GET",
        }, (err, res, body) => {
            resolve(JSON.parse(body));
        });
    });
}

function getGetStartedMessage() {
    return {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [
                    {
                        "title": "Welcome to Learning fan page!",
                        "image_url": "https://www.jtinetwork.com/wp-content/uploads/2020/07/courseintroimage-1024x576.jpg",
                        "subtitle": "We have the right course for everyone.",
                        "default_action": {
                            "type": "web_url",
                            "url": "https://petersfancybrownhats.com/view?item=103",
                            "webview_height_ratio": "tall",
                        },
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Find courses",
                                "payload": "FIND_COURSE"
                            }, {
                                "type": "postback",
                                "title": "Popular courses",
                                "payload": "BROWSE_POPULAR_COURSE"
                            }
                        ]
                    }
                ]
            }
        }
    }
}

function handleGetStarted(sender_psid) {
    return new Promise(async (resolve, reject) => {
        try {
            const personProfile = await getPersonProfile(sender_psid);

            let response = { text: `Xin chào Pé ${personProfile.last_name + " " + personProfile.first_name}, ko biết pé còn làm ở Viettel hông? 🤣🤣🤣` };

            await callSendAPI(sender_psid, getGetStartedMessage());

            resolve('success');
        } catch (err) {
            console.log(">> ~ file: chatbot.service.js ~ line 41 ~ returnnewPromise ~ err", err);
            reject(err);
        }
    });
}

export default {
    handleGetStarted,
    callSendAPI,
}