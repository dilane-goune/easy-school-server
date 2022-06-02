const userModel = require("../models/user");
const courseModel = require("../models/course");
const classModel = require("../models/class");
const questionModel = require("../models/question");
const examModel = require("../models/exam");
const examAnswersModel = require("../models/examAnswers");
const notificationsModel = require("../models/notifications");
const registrationsModel = require("../models/registrations");
const timeTableModel = require("../models/timeTable");
const jwt = require("jsonwebtoken");
const { scheduleExam } = require("../functions/agendaFunctions");
const dayjs = require("dayjs");
const { io } = require("../functions/express");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const countries = require("../assets/countriesObject.json");
const { unlinkSync } = require("fs");

module.exports.newRegistration = (req, res) => {
    // return res.sendStatus(201);
    const IDCardFile = req.files.IDCardFile[0]?.filename;
    const certificateFile = req.files.certificateFile[0]?.filename;
    const IDCardFilePath = req.files.IDCardFile[0]?.path;
    const certificatePath = req.files.certificateFile[0]?.path;

    const checkUser = userModel.findOne({ email: req.body.email });
    if (checkUser?._id) return res.sendStatus(409);
    userModel
        .findOne({ email: req.body.email })
        .then((doc) => {
            if (doc?._id) throw 409;
            return registrationsModel.create({
                ...req.body,
                country: countries[req.body.countryCode],
                IDCardFile,
                certificateFile,
            });
        })

        .then(() => {
            res.sendStatus(201);
        })
        .catch((e) => {
            if (e.code == 11000 || e === 409) {
                try {
                    unlinkSync(IDCardFilePath);
                    unlinkSync(certificatePath);
                } catch (e) {
                    console.log(e);
                }
                return res.sendStatus(409);
            }
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.getRegistrationData = (req, res) => {
    classModel
        .find({}, { specialization: 1, level: 1 })
        .then((docs) => {
            res.json({
                classes: docs,
                specializations: [
                    ...new Set(docs.map((c) => ({ name: c.specialization }))),
                ],
            });
        })
        .catch((e) => {
            console.log(e);
            res.json({ classes: [], specializations: [] });
        });
};

module.exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        let token;

        let user = await userModel.findOne({ email }, { courses: 0 });
        if (user?._id) {
            if (user.suspended) return res.sendStatus(405);
            if (user.password === "")
                return res.status(499).json({ id: user._id });
            if (user.password !== password) return res.sendStatus(401);
            else {
                token = jwt.sign(
                    { _id: user._id.toString(), isTeacher: user.isTeacher },
                    process.env.SECRET_KEY,
                    {
                        expiresIn: "1h",
                    }
                );

                // update last login
                await userModel.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            lastLogin: Date.now(),
                        },
                    }
                );
                res.status(200).json({ user, token });

                return;
            }
        }

        res.sendStatus(403);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.getFinishRegistrationInfo = (req, res) => {
    userModel
        .findOne(
            { id: req.params.userId, isTeacher: false },
            { name: 1, surName: 1, email: 1, password: 1 }
        )
        .then((doc) => {
            if (doc?.password !== "")
                return res.status(401).json({
                    message: encodeURIComponent(
                        "You never registered. Please register"
                    ),
                });
            res.json(doc);
        })
        .catch(() => res.json({}));
};

module.exports.finishRegistration = (req, res) => {
    const { userId, password } = req.body;
    userModel
        .updateOne({ _id: userId }, { $set: { password } })
        .then(() => res.sendStatus(200))
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.getTeacherCourses = async (req, res) => {
    try {
        let teacher = await userModel.findOne(
            { _id: req.userId, isTeacher: true },
            { _id: 1, courses: 1 }
        );

        let promises = teacher.courses.map(async (c) => {
            let data = {};
            await courseModel
                .findOne(
                    { courseCode: c.courseCode },
                    { name: 1, color: 1, courseCode: 1 }
                )
                .then((doc) => {
                    data.courseName = doc.name;
                    data.courseColor = doc.color;
                    data.courseCode = doc.courseCode;
                    return classModel.findOne(
                        { _id: c.classId },
                        { name: 1, level: 1 }
                    );
                })
                .then((doc) => {
                    data.teacherId = teacher._id;
                    data.classId = doc._id;
                    data.className = doc.name;

                    return data;
                });
            return data;
        });

        const result = await Promise.all(promises);
        res.json(result);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.getStudentCourses = async (req, res) => {
    const { classId } = req.params;

    try {
        let _class = {};

        _class = await classModel.findOne(
            { _id: classId },
            { name: 1, courses: 1 }
        );

        let promises = _class.courses.map(async (c) => {
            let data = {};
            await courseModel
                .findOne(
                    { courseCode: c.courseCode },
                    { name: 1, color: 1, courseCode: 1 }
                )
                .then((doc) => {
                    data.courseName = doc.name;
                    data.courseColor = doc.color;
                    data.courseCode = doc.courseCode;
                    return userModel.findOne(
                        { _id: c.teacherId, isTeacher: true },
                        { _id: 1 }
                    );
                })
                .then((doc) => {
                    data.teacherId = doc._id;
                    data.classId = _class._id;
                    data.className = _class.name;

                    return data;
                });
            return data;
        });

        const result = await Promise.all(promises);
        res.json(result);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.getOneCourse = async (req, res) => {
    try {
        const { courseCode, classId, teacherId } = req.params;

        const course = await courseModel.findOne(
            { courseCode },
            { chapters: 0 }
        );
        const studentClass = await classModel.findOne({ _id: classId });

        const teacher = await userModel.findOne(
            { _id: teacherId },
            { name: 1, surName: 1, diplomat: 1 }
        );

        let cc = {};
        cc.name = studentClass.name;
        cc.level = studentClass.level;

        const cc2 =
            studentClass.courses.find((c) => c.courseCode === courseCode) || {};

        cc.sessions = cc2.sessions;
        cc.time = cc2.time;
        cc.credit = cc2.credit;

        const exams = await examModel.find(
            { classId, courseCode },
            { name: 1, date: 1 }
        );

        res.json({
            course,
            _class: cc,
            teacher,
            exams,
        });
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

// questions
module.exports.newQuestion = (req, res) => {
    if (!req.body.answers.find((ans) => ans.isCorrect))
        return res.sendStatus(400);
    questionModel
        .create({ ...req.body, teacherId: req.userId })
        .then((doc) => {
            res.status(201).json({ _id: doc._id });
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.getQuestions = (req, res) => {
    const { limit, skip } = req.query;
    let teachers = [];
    let questions = [];
    let courseCodes = [];
    let specialization;
    userModel
        .findOne(
            { _id: req.userId },
            { "courses.courseCode": 1, specialization: 1 }
        )
        .then((teacher) => {
            courseCodes = [
                ...new Set(teacher.courses.map((c) => c.courseCode)),
            ];
            specialization = teacher.specialization;
            return userModel.find(
                { specialization: teacher.specialization, isTeacher: true },
                { name: 1, surName: 1 }
            );
        })
        .then((docs) => {
            teachers = docs;
            return questionModel
                .find({
                    specialization,
                    $or: [{ teacherId: req.userId }, { private: false }],
                })
                .skip(skip)
                .limit(limit);
        })
        .then((docs) => {
            questions = docs;
            return courseModel.find(
                { specialization, courseCode: { $in: courseCodes } },
                { name: 1, courseCode: 1 }
            );
        })
        .then((docs) => {
            res.json({ teachers, questions, courses: docs });
        })

        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.deleteQuestion = (req, res) => {
    questionModel
        .deleteOne({ _id: req.params.questionId, teacherId: req.userId })
        .then((result) => {
            if (!result.deletedCount) return res.sendStatus(401);
            res.sendStatus(204);
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

// exams
module.exports.getExamsQuestions = (req, res) => {
    const { courseCode, specialization } = req.params;
    if (!specialization) return res.sendStatus(401);
    let teachers = [];
    userModel
        .find({ specialization, isTeacher: true }, { name: 1, surName: 1 })
        .then((docs) => {
            teachers = docs;
            return questionModel.find({
                courseCode,
                $or: [{ teacherId: req.userId }, { private: false }],
            });
        })
        .then((docs) => {
            res.json({ teachers, questions: docs });
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.newExam = async (req, res) => {
    try {
        const newExam = req.body;
        if (
            !(parseFloat(newExam.duration) > 0) ||
            !newExam.name ||
            !newExam.date
            // ||
            // newExam.date < new Date().valueOf() + 1000 * 60 * 60

            // TODO: remove the above comment
        ) {
            return res.sendStatus(400);
        }

        const { classId } = newExam;

        const classExams = await examModel.find(
            { classId },
            { date: 1, duration: 1 }
        );

        let conflict = false;

        classExams.forEach((ce) => {
            if (
                !(
                    newExam.date > ce.date + ce.duration * 3600000 ||
                    newExam.date + newExam.duration * 3600000 < ce.date
                )
            ) {
                return (conflict = true);
            }
        });

        if (conflict) return res.sendStatus(409);

        // create exam
        const exam = await examModel.create({
            ...newExam,
            teacherId: req.userId,
        });

        const startDate = new Date(newExam.date);

        // add 2 supplimentary minutes for server to recieve all the exams
        const endDate = new Date(
            newExam.date + newExam.duration * 60 * 60 * 1000 + 120000
        );

        // schedule exam job
        await scheduleExam(
            exam._id,
            newExam.name,
            startDate,
            endDate,
            newExam.exam
        );

        // add notification to database
        await notificationsModel.create({
            classId: newExam.classId,
            primary: newExam.name,
            secondary: dayjs(newExam.date).format("lll"),
            type: "class",
        });

        // send notification to connected students
        io.to(newExam.classId).emit("notifications", {
            classId: newExam.classId,
            primary: newExam.name,
            secondary: "Exam on " + dayjs(newExam.date).format("lll"),
            type: "class",
        });

        res.sendStatus(201);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.getExams = async (req, res) => {
    const { classId } = req.query;
    let restriction = { teacherId: req.userId };
    if (classId) restriction = { classId };
    try {
        const examsList = await examModel.find(restriction, {
            name: 1,
            date: 1,
            duration: 1,
            isWritten: 1,
            courseCode: 1,
            teacherId: 1,
            classId: 1,
            hasStarted: 1,
            hasPassed: 1,
        });
        // console.log(examsList);

        let result = examsList.map(async (exam) => {
            try {
                const newObject = {
                    name: exam.name,
                    date: exam.date,
                    duration: exam.duration,
                    isWritten: exam.isWritten,
                    courseCode: exam.courseCode,
                    teacherId: exam.teacherId,
                    classId: exam.classId,
                    hasPassed: exam.hasPassed,
                    hasStarted: exam.hasStarted,
                    _id: exam._id,
                };

                await courseModel
                    .findOne({
                        courseCode: exam.courseCode,
                    })
                    .then((course) => {
                        newObject.courseName = course?.name;
                        return userModel.findOne({
                            _id: exam.teacherId,
                        });
                    })
                    .then((teacher) => {
                        newObject.teacherName =
                            teacher?.name + " " + teacher?.surName;
                        return classModel.findOne(
                            { _id: exam.classId },
                            { name: 1 }
                        );
                    })
                    .then((doc) => {
                        newObject.className = doc.name;
                        return newObject;
                    });
                return newObject;
            } catch (e) {
                console.log(e);
            }
        });

        result = await Promise.all(result);
        res.json(result);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.getFullExam = async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await examModel.findOne(
            { _id: examId },
            {
                "questions.questionId": 1,
                name: 1,
                date: 1,
                classId: 1,
                duration: 1,
                courseCode: 1,
                hasStarted: 1,
                hasPassed: 1,
            }
        );

        if (!exam?._id) return res.sendStatus(400);
        if (exam?.hasPassed) return res.sendStatus(406);
        if (!exam?.hasStarted) return res.sendStatus(450);

        const userDoc = await examAnswersModel.findOne(
            { examId, userId: req.userId },
            { _id: 1 }
        );
        if (userDoc?._id)
            return res.status(402).send("You already wrote the exam");

        const course = courseModel.findOne(
            { courseCode: exam.courseCode },
            { name: 1 }
        );

        const promises = exam.questions.map(async (q) => {
            const newObject = {};
            return questionModel
                .findOne(
                    { _id: q.questionId },
                    { question: 1, "answers.value": 1, "answers._id": 1 }
                )
                .then((doc) => {
                    newObject.question = doc.question;
                    newObject.answers = doc.answers;
                    newObject.questionId = doc._id;
                    return newObject;
                });
        });

        const result = await Promise.all(promises);
        res.json({
            questions: result,
            exam: {
                name: exam.name,
                date: exam.date,
                duration: exam.duration,
                courseName: course.name,
            },
        });
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.submitExam = async (req, res) => {
    try {
        const { examId, userId, questions } = req.body;
        const exam = await examModel.findOne({ _id: examId }, { hasPassed: 1 });

        if (!exam?._id) return res.sendStatus(400);
        if (exam?.hasPassed) return res.sendStatus(406);

        const userDoc = await examAnswersModel.findOne(
            { examId, userId },
            { _id: 1 }
        );
        if (userDoc?._id) return res.sendStatus(402);

        await examAnswersModel.create({ examId, userId, questions });
        res.sendStatus(201);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

// password recovery
module.exports.getRecoveryCode = async (req, res) => {
    const { email } = req.body;
    const uuidCode = uuidv4();

    try {
        let user = await userModel.findOne(
            { email, suspended: false },
            {
                recoveryCode: 1,
                name: 1,
                surName: 1,
            }
        );
        if (user?._id) {
            const transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE,
                auth: {
                    user: process.env.EMAIL_ACCOUNT,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            // TODO: change the localhost to the real domain
            await transporter.sendMail({
                from: process.env.EMAIL_ACCOUNT,
                to: email,
                subject: "Easy School Password Recovery",
                html: `
                <h2>Easy School Password Recovery</h2>
                <p>Dear <strong>${user.name + " " + user.surName}</strong></p>
                <p>
                Recover your password  
                <a href="${
                    process.env.DOMAIN
                }/confirm-recovery-code/${uuidCode}">
                here</a>
                </p>
            `,
            });

            await userModel.updateOne(
                { email },
                { $set: { recoveryCode: uuidCode } }
            );
            return res.sendStatus(200);
        }

        res.sendStatus(404);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.confirmRecoveryCode = async (req, res) => {
    const { password, code } = req.body;

    if (!code) return res.sendStatus(401);

    try {
        let user = await userModel.findOne({ recoveryCode: code });
        if (user?._id) {
            await userModel.updateOne(
                { recoveryCode: code },
                { $set: { password, recoveryCode: null } }
            );
            return res.sendStatus(200);
        }

        res.sendStatus(401);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.extendToken = (req, res) => {
    const authorization =
        req.headers.authorization ||
        req.body.authorization ||
        req.params.authorization;
    if (!authorization) return res.sendStatus(401);
    const { password, email } = req.body;

    const token = authorization.split(" ")[1];

    console.log("extend token => ", token);

    if (!token || !password || !email) return res.sendStatus(401);

    jwt.verify(token, process.env.SECRET_KEY, (error) => {
        if (error) {
            if (error.message == "jwt expired") {
                userModel
                    .findOne({ email, password }, { _id: 1, isTeacher: 1 })
                    .then((doc) => {
                        if (!doc?._id) return res.sendStatus(401);
                        let newToken = jwt.sign(
                            {
                                _id: doc._id.toString(),
                                isTeacher: doc.isTeacher,
                            },
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
        } else return res.sendStatus(401);
    });
};

module.exports.getTimeTableData = async (req, res) => {
    const { classId } = req.params;

    try {
        const doc = await classModel.findOne(
            { _id: classId },
            { courses: { courseCode: 1, teacherId: 1 } }
        );

        const promises = doc.courses.map(async (c) => {
            const newObject = {};
            await userModel
                .findOne(
                    { _id: c.teacherId, isTeacher: true },
                    { name: 1, surName: 1, diplomat: 1 }
                )
                .then((doc) => {
                    newObject.teacherName = doc.name + " " + doc.surName;
                    newObject.teacherDiplomat = doc.diplomat;
                    return courseModel.findOne(
                        { courseCode: c.courseCode },
                        { name: 1, courseCode: 1 }
                    );
                })
                .then((doc) => {
                    newObject.courseCode = doc.courseCode;
                    newObject.courseName = doc.name;
                });
            return newObject;
        });

        const result = await Promise.all(promises);
        res.json(result);
    } catch (e) {
        console.log(e);
    }
};

module.exports.newTimeTable = async (req, res) => {
    const { classId, program, week, year } = req.body;

    try {
        const user = await userModel.findOne({
            _id: req.userId,
            classId,
            isTeacher: true,
        });

        if (!user?._id) return res.sendStatus(401);

        await timeTableModel.findOneAndUpdate(
            { classId, week, year },
            { year, week, classId, program },
            { upsert: true }
        );

        return res.sendStatus(201);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.getTimeTable = async (req, res) => {
    const { year, classId } = req.query;
    const week = JSON.parse(req.query.week);

    timeTableModel
        .findOne({ week, year, classId })
        .then((doc) => {
            res.json(doc || {});
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};
