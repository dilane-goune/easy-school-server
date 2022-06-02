const jwt = require("jsonwebtoken");
require("dotenv").config();
const nodemailer = require("nodemailer");
const { unlinkSync } = require("fs");
const path = require("path");

// models
const adminModel = require("../models/admin");
const courseModel = require("../models/course");
const specialisationModel = require("../models/specialisation");
const classModel = require("../models/class");
const userModel = require("../models/user");
const registrationsModel = require("../models/registrations");

module.exports.login = async (req, res) => {
    let token;
    adminModel
        .findOne({ userName: req.body.userName })
        .then((doc) => {
            if (doc?._id) {
                if (doc.password === req.body.password) {
                    try {
                        token = jwt.sign(
                            { _id: doc._id.toString() },
                            process.env.SECRET_KEY,
                            {
                                expiresIn: "1h",
                            }
                        );

                        res.status(200).json({ user: doc, token });
                    } catch (e) {
                        console.log(e);
                        res.sendStatus(500);
                    }
                } else {
                    res.sendStatus(401);
                }
            } else res.sendStatus(404);
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.newCourse = (req, res) => {
    courseModel
        .create(req.body)
        .then(() => {
            res.sendStatus(201);
        })
        .catch((e) => {
            if (e.code === 11000) return res.sendStatus(409);
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.getCourses = (req, res) => {
    courseModel
        .find()
        .then((docs) => {
            res.json(docs);
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

// classes
module.exports.newClass = (req, res) => {
    let classId;
    classModel
        .create(req.body)

        .then((doc) => {
            classId = doc._id;

            const promises = [];
            req.body.courses.forEach((c) =>
                promises.push(
                    userModel.updateOne(
                        { _id: c.teacherId },
                        {
                            $push: {
                                courses: {
                                    courseCode: c.courseCode,
                                    classId: doc._id,
                                },
                            },
                        }
                    )
                )
            );

            return Promise.all(promises);
        })
        .then(() => {
            userModel.updateOne(
                { _id: req.body.teacherId, isTeacher: true },
                { $set: { classId } }
            );
        })
        .then(() => {
            return res.json({ _id: classId });
        })
        .catch((e) => {
            console.log(e);
            if (e.code === 11000) return res.sendStatus(409);
            res.sendStatus(500);
        });
};

module.exports.updateClass = async (req, res) => {
    try {
        const oldCourses =
            (
                await classModel.findOne(
                    { _id: req.params.classId },
                    { courses: { courseCode: 1, teacherId: 1 } }
                )
            )?.courses || [];

        const newCourses = req.body;

        const oldTeachersUpdatePromises = oldCourses.map(
            async (oldC) =>
                await userModel.updateOne(
                    { _id: oldC.teacherId },
                    {
                        $pull: {
                            courses: { classId: req.params.classId },
                        },
                    }
                )
        );

        const newTeachersUpdatePromises = newCourses.map(
            async (newC) =>
                await userModel.updateOne(
                    { _id: newC.teacherId },
                    {
                        $push: {
                            courses: {
                                courseCode: newC.courseCode,
                                teacherId: newC.teacherId,
                                classId: req.params.classId,
                            },
                        },
                    }
                )
        );

        await classModel.updateOne(
            { _id: req.params.classId },
            {
                $set: {
                    courses: newCourses,
                },
            }
        );
        await Promise.all(oldTeachersUpdatePromises);
        await Promise.all(newTeachersUpdatePromises);

        res.sendStatus(200);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.getClasses = (req, res) => {
    let data = {};
    classModel
        .find(
            {},
            { __v: 0, students: 0, "courses.sessions": 0, "courses.exams": 0 }
        )
        .then((docs) => {
            data.classes = docs;
            return specialisationModel.find();
        })
        .then((docs) => {
            data.specializations = docs;
            return courseModel.find({}, { chapters: 0 });
        })
        .then((docs) => {
            data.courses = docs;
            return userModel.find(
                { isTeacher: true },
                { name: 1, surName: 1, specialization: 1 }
            );
        })
        .then((docs) => {
            data.teachers = docs;
            res.json(data);
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

// teacher
module.exports.newTeacher = (req, res) => {
    userModel
        .create({ ...req.body, isTeacher: true, password: "passw0rd" })
        .then((doc) => {
            res.status(201).json({ _id: doc._id, createdAt: doc.createdAt });
        })
        .catch((e) => {
            if (e.code === 11000) return res.sendStatus(409);
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.getTeachers = (req, res) => {
    const projection = {
        email: 1,
        name: 1,
        surName: 1,
        gender: 1,
        dateOfBirth: 1,
        country: 1,
        telephone: 1,
        lastSeen: 1,
        pp: 1,
        createdAt: 1,
        specialization: 1,
        diplomat: 1,
    };
    let teachers;
    userModel
        .find({ isTeacher: true }, projection)
        .then((docs) => {
            teachers = docs;
            return specialisationModel.find();
        })
        .then((docs) => {
            res.json({ teachers, specializations: docs.map((s) => s.name) });
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

// student

module.exports.getRegitrations = (req, res) => {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 100;

    registrationsModel
        .find()
        .skip(skip)
        .limit(limit)
        .then((docs) => {
            res.json(docs);
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.getOneRegitration = (req, res) => {
    registrationsModel
        .findOne({ _id: req.params.id })
        .then((doc) => {
            res.json(doc);
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.rejectStudent = (req, res) => {
    let student;

    registrationsModel
        .findOne(
            { _id: req.params.id },
            {
                name: 1,
                surName: 1,
                email: 1,
                IDCardFile: 1,
                certificateFile: 1,
            }
        )

        .then((doc) => {
            if (!doc) throw 404;

            student = doc;

            const transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE,
                auth: {
                    user: process.env.EMAIL_ACCOUNT,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            return transporter.sendMail({
                from: process.env.EMAIL_ACCOUNT,
                to: doc.email,
                subject: "Easy School Registration",

                html: `<main>
                <header>
                    <h2>Easy School Registration</h2>
                    <h3>Rejected</h3>
                    <p>Hello <strong>${
                        doc.name + " " + student.surName
                    }</strong></p>
                    <p>
                        We are sorry. Your registration has been rejected due to th
                        following reason.
                    </p>
                </header>
                <ol>
                    <li>${req.body.reason}</li>
                </ol>
                <span>
                    for any issue, contact the easy school
                    <a href="http://" target="_blank">help-center</a>.
                </span>
                <br />
            </main>`,
            });
        })
        .then(() => {
            return registrationsModel.deleteOne({ _id: student._id });
        })
        .then(() => {
            res.sendStatus(204);
            try {
                unlinkSync(
                    path.join(
                        process.env.PWD,
                        "/static/registrations/",
                        student.IDCardFile
                    )
                );
                unlinkSync(
                    path.join(
                        process.env.PWD,
                        "/static/registrations/",
                        student.certificateFile
                    )
                );
            } catch (e) {
                console.log(e);
            }
        })
        .catch((e) => {
            console.log(e);
            if (e === 404) return res.sendStatus(404);
            if (e === 400) return res.sendStatus(400);
            res.sendStatus(500);
        });
};

module.exports.confirmStudent = (req, res) => {
    const { studentId } = req.params;

    let student = {};

    registrationsModel
        .findOne({ _id: studentId })
        .then((doc) => {
            if (!doc?._id) throw 404;

            student = {
                email: doc.email,
                password: doc.password,
                telephone: doc.telephone,
                name: doc.name,
                surName: doc.surName,
                gender: doc.gender,
                dateOfBirth: doc.dateOfBirth,
                country: doc.country,
                classId: doc.classId,
                specialization: doc.specialization,
                IDCardFile: doc.IDCardFile,
                certificateFile: doc.certificateFile,
            };

            return userModel.create(student);
        })
        .then((doc) => {
            student._id = doc._id;
            const transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE,
                auth: {
                    user: process.env.EMAIL_ACCOUNT,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });
            // TODO: put the right domain
            return transporter.sendMail({
                from: process.env.EMAIL_ACCOUNT,
                to: student.email,
                subject: "Easy School Registration",

                html: `<main>
                <header>
                    <h2>Easy School Registration</h2>
                    <h3>Confirmed</h3>
                </header>
                <section>

                    <p>Hello <strong>${
                        student.name + " " + student.surName
                    }</strong></p>
                    <h3>Congratulations</h3>
                    <p>
                        Your registration at easy-School have just been accepted. 
                    </p>
                    <p>
                        Complete your registration  
                        <a href="${process.env.DOMAIN}/finish-registration/${
                    student._id
                }" target="_blank">here</a>. 
                    </p>
                </section>
                <br/>
                <br/>
                <br/>
                <br/>
                
                <span>
                    For any issue, visit the easy school
                    <a href="${
                        process.env.DOMAIN
                    }/help" target="_blank">help page</a>.
                </span>
                <br />
            </main>`,
            });
        })
        .then(() => {
            return registrationsModel.deleteOne({ email: student.email });
        })
        .then(() => {
            try {
                unlinkSync(
                    path.join(
                        process.env.PWD,
                        "/static/registrations/",
                        student.IDCardFile
                    )
                );
                unlinkSync(
                    path.join(
                        process.env.PWD,
                        "/static/registrations/",
                        student.certificateFile
                    )
                );
            } catch (e) {
                console.log(e);
            }
            res.sendStatus(201);
        })
        .catch((e) => {
            console.log(e);
            if (e === 404) return res.sendStatus(404);
            res.sendStatus(500);
        });
};

module.exports.extendToken = (req, res) => {
    const authorization =
        req.headers.authorization ||
        req.body.authorization ||
        req.params.authorization;
    if (!authorization) return res.sendStatus(401);
    const { password, userName } = req.body;

    const token = authorization.split(" ")[1];

    if (!token || !password || !userName) return res.sendStatus(401);

    jwt.verify(token, process.env.SECRET_KEY, (error) => {
        if (error) {
            if (error.message == "jwt expired") {
                adminModel
                    .findOne({ userName, password })
                    .then((doc) => {
                        if (!doc?._id) return res.sendStatus(401);
                        let newToken = jwt.sign(
                            { _id: doc._id.toString() },
                            process.env.SECRET_KEY,
                            {
                                expiresIn: "1h",
                            }
                        );
                        res.json(newToken);
                    })
                    .catch((e) => {
                        console.log(e);
                        res.sendStatus(500);
                    });
            } else return res.json(401);
        } else {
            return res.sendStatus(401);
        }
    });
};
