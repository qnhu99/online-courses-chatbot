import dotenv from 'dotenv';
import request from "request";
import homeController from '../controllers/home.controller';

dotenv.config();

const { PAGE_ACCESS_TOKEN, API_DOMAIN, WEB_DOMAIN, INTERNAL_ERROR_MESSAGE } = process.env;

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
  // Checks if the message contains text
  if (received_message.text) {
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    let text = received_message.text.trim();
    let startsWith = text.substring(0, 7);

    if (startsWith.toLowerCase() === "search:") {
      let searchKeyWords = text.substring(7).trim();
      if (searchKeyWords.length > 0) {
        homeController.handleSearchCourses(sender_psid, searchKeyWords);
      } else {
        let response = {
          "text": `Từ khóa tìm kiếm không thể là rỗng 😅`
        }
        homeController.callSendAPI(sender_psid, response);
      }
    } else {
      let response = {
        "text": `Bạn vừa gửi mình tin nhắn "${received_message.text}", nhưng mình chưa biết phải làm gì T_T.`
      }
      homeController.callSendAPI(sender_psid, response);
    }
  }
}

// Handles messaging_postbacks events
async function handlePostback(sender_psid, received_postback) {
  let response;

  // Get the payload for the postback
  let payload = JSON.parse(received_postback.payload);

  // Set the response based on the postback payload
  switch (payload.type) {
    case 'GET_STARTED':
    case 'RESTART_BOT':
      response = await homeController.handleGetStarted(sender_psid);
      return;
    case 'FIND_COURSE':
      response = { text: `Bạn vui lòng nhập từ khóa muốn tìm theo dạng:\nsearch: <Từ khóa>` };
      break;
    case 'BROWSE_BY_CATEGORIES':
      response = await homeController.handleBrowseByCategories(sender_psid, payload.categoryId, payload.categoryRank);
      return;
    default:
      response = { text: `Mình chưa biết phản hồi lệnh '${payload}' này của bạn 😭😭😭.` };
      break;
  }

  // Send the message to acknowledge the postback
  homeController.callSendAPI(sender_psid, response);
}

export async function setupProfile(req, res) {
  const request_body = {
    "get_started": {
      payload: JSON.stringify({ type: "GET_STARTED" })
    },
    "whitelisted_domains": ["https://git.heroku.com/online-courses-chatbot.git"],
    "persistent_menu": [
      {
        "locale": "default",
        "composer_input_disabled": false,
        "call_to_actions": [
          {
            "type": "web_url",
            "title": "Đến trang web",
            "url": WEB_DOMAIN,
            "webview_height_ratio": "full"
          },
          {
            "type": "postback",
            "title": "Khởi động lại chatbot",
            "payload": JSON.stringify({ type: "RESTART_BOT" })
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
      console.log('Setup FB user profile SUCCESS');
    } else {
      console.error("Setup FB user profile FAIL:" + err);
    }
  });
}
