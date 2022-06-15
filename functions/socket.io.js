const { getNotifications } = require("./notifications");
const userModel = require("../models/user");
const { Server: IOServer } = require("socket.io");
const { server, peerServer } = require("./express");
const { v4: uuidv4 } = require("uuid");

const io = new IOServer(server);

module.exports = io;

const onlineClassesNameSpace = {};

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

    socket.on("user-refresh", (payload, cb) => {
        if (payload.classId) {
            socket.join(payload.classId);
            cb && cb();
        }
    });

    socket.on(
        "start-class",
        ({ userId, classId, peerId, userName, pp }, callBack) => {
            const teacher = new OnlineTeacher(
                userId,
                classId,
                peerId,
                socket,
                userName,
                pp
            );
            onlineClassesNameSpace[userId] = teacher;

            callBack && callBack("OK");
        }
    );

    socket.on(
        "join-class",
        ({ userId, peerId, userName, teacherId, classId, pp }, callBack) => {
            if (
                onlineClassesNameSpace[teacherId] &&
                onlineClassesNameSpace[teacherId]?.classId === classId
            ) {
                onlineClassesNameSpace[teacherId].callStudentToJoinClass(
                    userId,
                    peerId,
                    userName,
                    pp,
                    socket,
                    callBack
                );
            } else {
                callBack && callBack(null);
            }
        }
    );
});

class OnlineTeacher {
    peerId;
    socket;
    userId;
    userName;
    classId;
    roomName;
    pp;
    participants = [];

    constructor(userId, classId, peerId, socket, userName, pp) {
        this.socket = socket;
        this.peerId = peerId;
        this.userId = userId;
        this.userName = userName;
        this.classId = classId;
        this.pp = pp;
        this.roomName = uuidv4();

        this.socket.join(this.roomName);

        this.participants.push({
            userId: this.userId,
            userName: this.userName,
            pp: this.pp,
            isTeacher: true,
        });

        this.socket.on("disconnect", this.disconnect);
        this.socket.on("message", (message, cb) => {
            this.socket.broadcast.emit("new-message", message);
            cb(true);
        });
        this.socket.on("end-class", this.endClass);
        peerServer.on("disconnect", (peerClient) => {
            if (peerClient.getId() === this.peerId)
                this.disconnect("loss peer");
        });
    }

    disconnect(reason) {
        delete onlineClassesNameSpace[this.userId];
        console.log("onlineClassesNameSpace : # disconnection => " + reason);
        io.to(this.roomName).emit("teacher-disconnected");
    }
    endClass(cb) {
        this.socket?.broadcast.emit("end-class");
        delete onlineClassesNameSpace[this.userId];
        cb(true);
    }

    callStudentToJoinClass(userId, peerId, userName, pp, socket, callBack) {
        this.socket?.emit("join-request", { peerId, userName }, (ok) => {
            if (ok) {
                io.to(this.roomName).emit("new-user", { userId, userName, pp });

                socket.join(this.roomName);

                this.participants.push({ userId, userName, pp });

                socket.on("message", (message, cb) => {
                    socket.broadcast.emit("new-message", message);
                    cb(true);
                });

                socket.on("disconnect", () => {
                    this.participants = this.participants.filter(
                        (p) => p.userId !== userId
                    );
                    io.to(this.roomName).emit("user-disconnect", userId);
                });
                socket.on("quit-class", () => {
                    this.participants = this.participants.filter(
                        (p) => p.userId !== userId
                    );
                    socket.leave(this.roomName);
                    io.to(this.roomName).emit("user-disconnect", userId);
                });

                callBack(this.participants);
            } else callBack(false);
        });
    }
}
