import express from "express";
import * as chatbotService from '../services/chatbot.service'

let router = express.Router();

export default app => {
    router.get("/", chatbotService.getHomePage);

    router.post("/setup-profile", chatbotService.setupProfile);

    router.post('/webhook', chatbotService.postWebhook);
    router.get('/webhook', chatbotService.getWebhook);
    return app.use('/', router);
}
