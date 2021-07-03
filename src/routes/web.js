import express from "express";
import * as homeController from "../controllers/home.controller";

let router = express.Router();

export default app => {
    router.get("/", homeController.getHomePage);

    router.post("/setup-profile", homeController.setupProfile);

    router.post('/webhook', homeController.postWebhook);
    router.get('/webhook', homeController.getWebhook);
    return app.use('/', router);
}
