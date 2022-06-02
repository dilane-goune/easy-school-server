const adminModel = require("../models/admin");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const authorization =
        req.headers.authorization ||
        req.body.authorization ||
        req.params.authorization;
    if (!authorization) return res.sendStatus(401);

    const token = authorization.split(" ")[1];
    let userId;

    try {
        userId = jwt.verify(token, process.env.SECRET_KEY)._id;
    } catch (error) {
        console.log(error);
        if (error.message == "jwt expired") return res.sendStatus(403);

        return res.sendStatus(401);
    }

    if (!userId) return res.sendStatus(401);

    adminModel
        .findOne({ _id: userId }, { _id: 1 })
        .then((doc) => {
            if (!doc?._id) return res.sendStatus(401);
            req.userId = doc?._id;
            return next();
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};
