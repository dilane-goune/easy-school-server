const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const authorization =
        req.headers.authorization ||
        req.body.authorization ||
        req.query.pem ||
        req.params.authorization;
    if (!authorization) return res.sendStatus(401);
    const token = authorization.split(" ")[1];
    let user;

    try {
        user = jwt.verify(token, process.env.ES_SECRET_KEY);
        if (!user.isTeacher) return res.sendStatus(403);
        req.user = user;
        next();
    } catch (error) {
        console.log(error);
        if (error.message == "jwt expired") return res.sendStatus(403);
        console.log("token to extend = " + token);

        return res.sendStatus(401);
    }
};
