import dotenv from 'dotenv';
import request from "request";

dotenv.config();

const { PAGE_ACCESS_TOKEN, API_DOMAIN, WEB_DOMAIN, INTERNAL_ERROR_MESSAGE } = process.env;


function testUrl(url) {
  const urlExpression = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/;

  return urlExpression.test(url);
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
      console.log(">> ~ file: chatbot.service.js ~ line 26 ~ callSendAPI ~ body", body);
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

function getPersonProfile(sender_psid) {
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
            "title": "Chào mừng bạn đến với online course fanpage",
            "image_url": "https://www.jtinetwork.com/wp-content/uploads/2020/07/courseintroimage-1024x576.jpg",
            "subtitle": "Ut ea sint nostrud culpa esse consequat adipisicing labore dolor pariatur ex quis.",
            "default_action": {
              "type": "web_url",
              "url": WEB_DOMAIN,
              "webview_height_ratio": "tall",
            },
            "buttons": [
              {
                "type": "postback",
                "title": "Tìm kiếm khóa học",
                "payload": JSON.stringify({ type: "FIND_COURSE" })
              }, {
                "type": "postback",
                "title": "Xem nhiều nhất",
                "payload": JSON.stringify({ type: "BROWSE_MOST_VIEW_COURSE" })
              }, {
                "type": "postback",
                "title": "Xem theo thể loại",
                "payload": JSON.stringify({ type: "BROWSE_BY_CATEGORIES" })
              }
            ]
          }
        ]
      }
    }
  }
}

function handleBrowseMostViewCourses(sender_psid) {
  return new Promise(async (resolve, reject) => {
    try {
      const [courses, coursesErr] = await getMostViewCourses();

      let response;
      if (coursesErr) {
        response = {
          "text": INTERNAL_ERROR_MESSAGE
        }
      } else if (courses.length === 0) {
        response = {
          "text": "Không có khóa học để hiển thị."
        }
      } else {
        response = getResponseFromCourses(courses);
      }

      await callSendAPI(sender_psid, response);

      resolve('success');
    } catch (err) {
      reject(err);
    }
  });
}

function handleGetStarted(sender_psid) {
  return new Promise(async (resolve, reject) => {
    try {
      const personProfile = await getPersonProfile(sender_psid);


      await callSendAPI(sender_psid, getGetStartedMessage());

      resolve('success');
    } catch (err) {
      reject(err);
    }
  });
}

function getCategories(categoryId) {
  return new Promise((resolve) => {
    const url = `${API_DOMAIN}/api/categories/${categoryId ? categoryId : ''}`;

    request({
      "uri": url,
      "qs": { "limit": 50 },
      "method": "GET",
    }, (err, res, body) => {
      body = JSON.parse(body);
      let result = [categoryId ? body?.data?.categories : body?.data?.rows, err];
      if (!result[0]) {
        result[0] = [];
      }
      resolve(result);
    });
  });
}



export default {
  handleGetStarted,
  callSendAPI,
  handleBrowseByCategories,
  handleBrowseMostViewCourses,
  handleSearchCourses,
}