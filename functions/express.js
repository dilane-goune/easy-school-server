const https = require("https");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Server: IOServer } = require("socket.io");
const { getNotifications } = require("./notifications");
const userModel = require("../models/user");

const options = {
    key: fs.readFileSync(path.join(process.env.PEM_KEYS, "key.pem")),
    cert: fs.readFileSync(path.join(process.env.PEM_KEYS, "cert.pem")),
};

const API = process.env.API;

const app = express();

app.use(express.json());
app.use(
    API + "/profile-pictutres/",
    express.static(path.join(process.env.PWD, "/static/profile-pictutres"))
);
app.use(
    API + "/registration-files/",
    express.static(path.join(process.env.PWD, "/static/registrations"))
);
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

const server = https.createServer(options, app);

const io = new IOServer(server);

const PORT = process.env.SERVER_PORT || 8888;
const ADDRESS = process.env.SERVER_ADDRESS || "0.0.0.0";

server.listen(PORT, ADDRESS, () => {
    console.log(`listenning at http://localhost:${PORT}`);
});

module.exports = { app, io };

io.on("connection", (socket) => {
    socket.on("user-login", (payload) => {
        if (payload.classId) {
            socket.join(payload.classId);
        }
        getNotifications(payload.userId, payload.classId).then((data) => {
            if (data) io.to(socket.id).emit("notifications", data);
            return userModel.updateOne(
                { _id: payload.userId },
                {
                    $set: {
                        lastLogin: Date.now(),
                    },
                }
            );
        });
    });

    socket.on("user-refresh", (payload) => {
        if (payload.classId) {
            socket.join(payload.classId);
        }
    });
    socket.on("ask-question", (payload) => {
        console.log(payload);
    });

    socket.on("ask-permission", (payload, callBack) => {
        console.log(payload);
        callBack();
    });

    // socket.on("disconnect", (reason) => {
    //     console.log("disconnection ", reason);
    // });
});

// let startTime = 1000000;

// setInterval(() => {
//     console.log(startTime);
//     startTime -= 1000;
//     io.to("6295ecfff60406a07ee5e5cb").emit("exam", startTime);
// }, 1000);
