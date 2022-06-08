const multer = require("multer");
const path = require("path");
const { tmpdir } = require("os");

const getDir = (type) => {
    const folders = {
        pp: path.join(process.env.PWD, "/static/profile-pictures/"),
        doc: path.join(process.env.PWD, "/static/documents/"),
        reg: path.join(process.env.PWD, "/static/registrations/"),
        tmp: tmpdir(),
    };
    return folders[type] || folders.tmp;
};

const randomFileName = (originalname) => {
    return (
        new Date().toISOString() +
            Math.round(Math.random() * 1000) +
            path.extname(originalname) ||
        `${new Date().toISOString() + Math.round(Math.random() * 1000)}`
    );
};

module.exports.documents = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, getDir("doc")),
        filename: (req, file, cb) => cb(null, file.originalname),
    }),
});

module.exports.registrations = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, getDir("reg")),
        filename: (req, file, cb) =>
            cb(null, randomFileName(file.originalname)),
    }),
});

module.exports.profilePictures = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, getDir("pp")),
        filename: (req, file, cb) =>
            cb(null, randomFileName(file.originalname)),
    }),
});
