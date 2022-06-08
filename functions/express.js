const https = require("http");
// const fs = require("fs");
const path = require("path");
const express = require("express");

const { ExpressPeerServer } = require("peer");
const userAuth = require("../middlewares/userAuth");

// const options = {
//     key: fs.readFileSync(path.join(process.env.ES_PEM_KEYS, "key.pem")),
//     cert: fs.readFileSync(path.join(process.env.ES_PEM_KEYS, "cert.pem")),
// };

const API = process.env.ES_API;
const PORT = process.env.ES_SERVER_PORT || 8888;
const ADDRESS = process.env.ES_SERVER_ADDRESS || "0.0.0.0";

// app
const app = express();

const server = https.createServer(
    // options,
    app
);

const peerServer = ExpressPeerServer(server, {
    path: "/peerjs",
    port: 8888,
});

app.use(express.json());

app.use(
    API + "/profile-pictures/",
    express.static(path.join(process.env.PWD, "/static/profile-pictures"))
);
app.use(
    API + "/documents/",
    userAuth,
    express.static(path.join(process.env.PWD, "/static/documents"))
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

app.use(peerServer);

server.listen(PORT, ADDRESS, () => {
    console.log(`listenning at http://localhost:${PORT}`);
});

module.exports = { app, server, peerServer };
