require("dotenv").config();
const nodemailer = require("nodemailer");
const { unlinkSync } = require("fs");
const path = require("path");
const countries = require("../assets/countriesObject.json");

// models
const courseModel = require("../models/course");
const specialisationModel = require("../models/specialisation");
const classModel = require("../models/class");
const userModel = require("../models/user");
const registrationsModel = require("../models/registrations");

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

module.exports.updateCourse = (req, res) => {
    courseModel
        .findOneAndUpdate(
            { courseCode: req.body.courseCode },
            { $set: { ...req.body } }
        )
        .then(() => {
            res.sendStatus(200);
        })
        .catch((e) => {
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
    delete req.body._id;
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
        const oldClass = await classModel.findOne(
            { _id: req.params.classId },
            { courses: { courseCode: 1, teacherId: 1 }, classMasterId: 1 }
        );
        const oldCourses = oldClass?.courses || [];

        const newCourses = req.body.courses;

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
            { $set: { ...req.body } }
        );
        await Promise.all(oldTeachersUpdatePromises);
        await Promise.all(newTeachersUpdatePromises);

        await userModel
            .findOneAndUpdate(
                { _id: oldClass.classMasterId },
                { $set: { classId: null } }
            )
            .then(() =>
                userModel.findOneAndUpdate(
                    { _id: req.body.classMasterId },
                    { $set: { classId: req.body.classMasterId } }
                )
            );

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
                { name: 1, surName: 1, specialization: 1, classId: 1 }
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
        .create({
            ...req.body,
            isTeacher: true,
            password: "passw0rd",
            country: countries[req.body.countryCode],
        })
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
        lastLogin: 1,
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
        .findOne({ _id: req.params.id })
        .then((doc) => {
            if (!doc) throw 404;

            student = doc._doc;

            const transporter = nodemailer.createTransport({
                service: process.env.ES_EMAIL_SERVICE,
                auth: {
                    user: process.env.ES_EMAIL_ACCOUNT,
                    pass: process.env.ES_EMAIL_PASSWORD,
                },
            });

            return transporter.sendMail({
                from: process.env.ES_EMAIL_ACCOUNT,
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
            registrationsModel.findOneAndUpdate(
                { email: student.email },
                {
                    $set: student,
                },
                { upsert: true }
            );

            if (e === 404) return res.sendStatus(404);
            if (e === 400) return res.sendStatus(400);
            res.sendStatus(500);
        });
};

module.exports.confirmStudent = (req, res) => {
    const { studentId } = req.params;

    let student;

    registrationsModel
        .findOne({ _id: studentId })
        .then((doc) => {
            if (!doc) throw 404;

            student = doc._doc;
            return userModel.create(student);
        })
        .then(() => {
            const transporter = nodemailer.createTransport({
                service: process.env.ES_EMAIL_SERVICE,
                auth: {
                    user: process.env.ES_EMAIL_ACCOUNT,
                    pass: process.env.ES_EMAIL_PASSWORD,
                },
            });
            // TODO: put the right domain
            return transporter.sendMail({
                from: process.env.ES_EMAIL_ACCOUNT,
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
                        <a href="${process.env.ES_DOMAIN}/finish-registration/${
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
                        process.env.ES_DOMAIN
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
            userModel.findOneAndDelete({ email: student.email }).then(() =>
                registrationsModel.findOneAndUpdate(
                    { email: student.email },
                    {
                        $set: student,
                    },
                    { upsert: true }
                )
            );
            console.log(e);
            if (e === 404) return res.sendStatus(404);
            res.sendStatus(500);
        });
};

// specialiazation
module.exports.getSpecializations = (req, res) => {
    specialisationModel
        .find()
        .then((docs) => res.json(docs))
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.newSpecialization = (req, res) => {
    specialisationModel
        .create(req.body)
        .then((doc) => res.status(201).json(doc))
        .catch((e) => {
            if (e.code === 11000) return res.sendStatus(409);
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.deleteSpecialization = (req, res) => {
    console.log(req.params);
    specialisationModel
        .deleteOne({ _id: req.params.id })
        .then(() => res.sendStatus(204))
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};
