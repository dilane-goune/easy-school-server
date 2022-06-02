const multer = require("multer");
const path = require("path");

module.exports.registrationStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        let saveDir = path.join(process.env.PWD, "/static/registrations/");

        cb(null, saveDir);
    },
    filename: (req, file, cb) => {
        let filename =
            new Date().toISOString() +
            Math.round(Math.random() * 1000) +
            path.extname(file.originalname);
        cb(
            null,
            filename ||
                `${new Date().toISOString() + Math.round(Math.random() * 1000)}`
        );
    },
});
