const userModel = require("../models/user");
const courseModel = require("../models/course");
const classModel = require("../models/class");
const questionModel = require("../models/question");
const examModel = require("../models/exam");
const notificationsModel = require("../models/notifications");
const registrationsModel = require("../models/registrations");
const timeTableModel = require("../models/timeTable");
const documentModel = require("../models/document");
const jwt = require("jsonwebtoken");
const { scheduleExam } = require("../functions/agendaFunctions");
const dayjs = require("dayjs");
const io = require("../functions/socket.io");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const countries = require("../assets/countriesObject.json");
const { unlinkSync } = require("fs");
const path = require("path");

// user
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

        let user = await userModel.findOne({ email }, { __v: 0 });
        if (user) {
            if (user.suspended) return res.sendStatus(405);
            if (user.password === undefined)
                return res.status(499).json({ id: user._id });
            if (user.password !== password) return res.sendStatus(401);
            else {
                token = jwt.sign(
                    {
                        _id: user._id.toString(),
                        isTeacher: user.isTeacher,
                        isAdmin: user.isAdmin,
                        name: user.name,
                        surName: user.surName,
                    },
                    process.env.ES_SECRET_KEY,
                    {
                        expiresIn: "20h",
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
                let userClass;
                if (user.classId) {
                    userClass = await classModel.findOne(
                        { _id: user.classId },
                        { name: 1, level: 1 }
                    );
                }

                const promises = user.courses.map(async (c) => {
                    const newObject = {};
                    await classModel
                        .findById(c.classId, { name: 1, level: 1 })
                        .then((doc) => {
                            newObject.className =
                                doc?.name + " - " + doc?.level;
                            newObject.classId = c.classId;
                            newObject.courseCode = c.courseCode;
                        });
                    return newObject;
                });
                const classCourses = await Promise.all(promises);
                if (!userClass)
                    return res.status(200).json({
                        user,
                        token,
                    });

                return res.status(200).json({
                    user: {
                        ...user._doc,
                        level: userClass.level,
                        className: userClass.name,
                        courses: classCourses,
                    },
                    token,
                });
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

module.exports.getProfileData = async (req, res) => {
    try {
        const firstDayOfWeekDate = dayjs().set("day", 1);
        const currentDate = dayjs();
        const { classId } = req.query;

        const day = currentDate.format("dddd").toLowerCase();
        const year = "" + currentDate.get("year");
        const week = `${firstDayOfWeekDate.format(
            "DD MMM YYYY"
        )} - ${firstDayOfWeekDate.add(6, "days").format("DD MMM YYYY")}`;

        let whatForToday = [];

        if (classId !== "undefined") {
            await timeTableModel
                .findOne({ week, year, classId }, { program: 1 })
                .then((doc) => {
                    const periods = {
                        p1: { start: "08h : 00", end: "10h : 00" },
                        p2: { start: "10h : 10", end: "12h : 40" },
                        p3: { start: "13h : 00", end: "15h : 00" },
                        p4: { start: "15h : 10", end: "16h : 20" },
                    };
                    if (doc) {
                        for (const key in doc.program) {
                            const p = doc.program[key][day];
                            whatForToday.push({
                                primary: p?.courseName ? p?.courseName : "free",
                                secondary:
                                    periods[key].start.split(" ")[0] +
                                    " - " +
                                    periods[key].end.split(" ")[0],
                            });
                        }
                    }
                });

            const lowerDate = currentDate
                .set("hours", 0)
                .set("minutes", 0)
                .set("seconds", 0)
                .set("milliseconds", 0);
            const upperDate = lowerDate.add(1, "day");

            await examModel
                .find(
                    {
                        date: {
                            $gte: lowerDate.valueOf(),
                            $lte: upperDate.valueOf(),
                        },
                        classId,
                    },
                    { name: 1, date: 1 }
                )
                .then((docs) => {
                    docs.forEach((d) => {
                        whatForToday.push({
                            primary: d.name,
                            secondary: dayjs(d.date).format("lll"),
                        });
                    });
                });
        }

        res.json({ whatForToday });
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.updatePP = (req, res) => {
    const pp = req.file;
    userModel
        .findOneAndUpdate(
            { _id: req.user._id },
            { $set: { pp: pp.filename } },
            { projection: { pp: 1, name: 1 } }
        )
        .then((doc) => {
            console.log(doc);
            if (doc && doc.pp !== "male.jpg" && doc.pp !== "female.jpg") {
                try {
                    unlinkSync(
                        process.env.PWD + "/static/profile-pictures/" + doc.pp
                    );
                } catch (e) {
                    console.log(e);
                }
            }
            res.json({ pp: pp.filename });
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

module.exports.removePP = (req, res) => {
    userModel
        .findOneAndUpdate(
            { _id: req.user._id },
            {
                $set: {
                    pp: req.query.gender === "M" ? "male.jpg" : "female.jpg",
                },
            },
            { projection: { pp: 1 } }
        )
        .then((doc) => {
            if (doc) {
                try {
                    unlinkSync(
                        process.env.PWD + "/static/profile-pictures/" + doc.pp
                    );
                } catch (e) {
                    console.log(e);
                }
            }
            res.sendStatus(200);
        })
        .catch((e) => {
            console.log(e);
            res.sendStatus(500);
        });
};

// coures
module.exports.getTeacherCourses = async (req, res) => {
    try {
        let teacher = await userModel.findOne(
            { _id: req.user._id, isTeacher: true },
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

        const exams = await examModel
            .find({ classId, courseCode }, { name: 1, date: 1 })
            .sort({ createdAt: -1 });

        const documents = await documentModel
            .find(
                { teacherId, courseCode, classId },
                {
                    title: 1,
                    body: 1,
                    files: 1,
                    createdAt: 1,
                    teacherName: 1,
                    teacherId: 1,
                }
            )
            .sort({ createdAt: -1 });

        res.json({
            course,
            _class: cc,
            teacher,
            exams,
            documents,
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
        .create({ ...req.body, teacherId: req.user._id })
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
            { _id: req.user._id },
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
                    $or: [{ teacherId: req.user._id }, { private: false }],
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
        .deleteOne({ _id: req.params.questionId, teacherId: req.user._id })
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
                $or: [{ teacherId: req.user._id }, { private: false }],
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
        const examDate = new Date(parseInt(req.body.date));

        const newExam = req.body;
        if (
            parseFloat(newExam.duration) < 0 ||
            !newExam.name ||
            !newExam.date ||
            examDate.valueOf() < new Date().valueOf() + 300000
        ) {
            return res.sendStatus(400);
        }

        const { classId } = newExam;

        const classExams = await examModel.find(
            { classId, isWritten: false },
            { date: 1, duration: 1 }
        );

        let conflict = false;

        classExams.forEach((ce) => {
            if (
                !(
                    examDate.valueOf() > ce.date + ce.duration * 3600000 ||
                    examDate.valueOf() + newExam.duration * 3600000 < ce.date
                )
            ) {
                conflict = true;
                return;
            }
        });

        if (conflict) return res.sendStatus(409);

        let totalScore = 0;

        newExam.questions.forEach((q) => {
            totalScore += q.correctPoints;
        });

        // create exam
        const exam = await examModel.create({
            ...newExam,
            teacherId: req.user._id,
            totalScore,
        });

        // schedule exam job
        await scheduleExam(
            exam._id,
            newExam.name,
            new Date(examDate.toISOString()),
            new Date(
                dayjs(examDate)
                    .add(newExam.duration, "hours")
                    .add(2, "minutes")
                    .toISOString()
            ),
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
    let restriction = { teacherId: req.user._id };
    if (classId) restriction = { classId };
    try {
        const examsList = await examModel
            .find(restriction, {
                name: 1,
                date: 1,
                duration: 1,
                isWritten: 1,
                courseCode: 1,
                teacherId: 1,
                classId: 1,
                hasStarted: 1,
                hasPassed: 1,
            })
            .sort({ date: -1, name: 1, duration: 1 });
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
                "questions": 1,
                "marks.userId": 1,
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

        if (
            exam.marks.find(
                (m) => m.userId.toString() === req.user._id.toString()
            )
        )
            return res.sendStatus(402);

        const hasAlreadyWritten = exam.marks.find(
            (m) => m.userId.toString() === req.user._id
        );
        if (hasAlreadyWritten) return res.sendStatus(402);

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
        const { examId, userId, questions: submitedQuestions } = req.body;
        const exam = await examModel.findOne(
            { _id: examId },
            { hasPassed: 1, questions: 1, "marks.userId": 1, totalScore: 1 }
        );

        if (!exam?._id) return res.sendStatus(400);
        if (exam?.hasPassed) return res.sendStatus(406);

        const hasAlreadyWritten = exam.marks.find(
            (m) => m.userId.toString() === userId
        );
        if (hasAlreadyWritten) return res.sendStatus(402);

        let mark = 0;
        let haveCorrectAnswer;

        const promises = exam.questions.map(async (q) => {
            const questionObject = await questionModel.findOne(
                { _id: q.questionId },
                { answers: 1 }
            );

            if (!questionObject) return;

            const responseObject =
                submitedQuestions.find(
                    (ques) => ques.questionId === q.questionId?.toString()
                ) || {};

            haveCorrectAnswer = true;
            questionObject.answers.forEach((ans) => {
                const resAnwer =
                    responseObject.answers.find(
                        (answer) => answer._id === ans._id?.toString()
                    ) || {};

                if (ans.isCorrect !== resAnwer.response) {
                    haveCorrectAnswer = false;
                    return;
                }
            });
            if (haveCorrectAnswer) mark += q.correctPoints;
            else mark += q.wrongPoints;
        });

        await Promise.all(promises);

        await examModel.updateOne(
            { _id: examId },
            { $push: { marks: { userId, mark } } }
        );

        res.status(201).json({ mark, total: exam.totalScore });
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

module.exports.getExamsResult = async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await examModel.findOne(
            { _id: examId },
            { name: 1, totalScore: 1, marks: 1, isWritten: 1 }
        );

        if (!exam || !exam?.isWritten) return res.sendStatus(400);

        const promises = exam.marks.map(async (m) => {
            try {
                const newObject = { mark: m.mark };
                await userModel
                    .findOne({ _id: m.userId }, { name: 1, surName: 1 })
                    .then((u) => {
                        newObject.userName = u.name + " " + u.surName;
                    });
                return newObject;
            } catch (e) {
                console.log(e);
                return {};
            }
        });

        const marks = await Promise.all(promises);

        res.json({
            name: exam.name,
            totalScore: exam.totalScore,
            marks,
            date: exam.date,
        });
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};

// documents
module.exports.newCourseDoucument = async (req, res) => {
    try {
        const { classId, courseCode } = req.params;

        const files = req.files?.map((f) => ({
            fileName: f.filename,
            size: f.size,
            mimeType: f.mimetype,
        }));

        const doc = await documentModel.create({
            title: req.body.title,
            body: req.body.body,
            classId,
            courseCode,
            teacherId: req.user._id,
            teacherName: req.user.name + " " + req.user.surName,
            files,
        });
        res.status(201).json({ _id: doc._id });
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
};
module.exports.deleteDocument = (req, res) => {
    const { id } = req.params;
    let document;
    documentModel
        .findOneAndDelete({
            _id: id,
        })
        .then((doc) => {
            document = doc._doc;
            doc.files.forEach((f) => {
                unlinkSync(
                    path.join(
                        process.env.PWD,
                        "static",
                        "documents",
                        f.fileName
                    )
                );
            });
            res.sendStatus(204);
        })
        .catch((e) => {
            console.log(e);
            documentModel.findByIdAndUpdate(
                { _id: id },
                { $set: document },
                { upsert: true }
            );
            res.sendStatus(500);
        });
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
                service: process.env.ES_EMAIL_SERVICE,
                auth: {
                    user: process.env.ES_EMAIL_ACCOUNT,
                    pass: process.env.ES_EMAIL_PASSWORD,
                },
            });

            // TODO: change the localhost to the real domain
            await transporter.sendMail({
                from: process.env.ES_EMAIL_ACCOUNT,
                to: email,
                subject: "Easy School Password Recovery",
                html: `
                <h2>Easy School Password Recovery</h2>
                <p>Dear <strong>${user.name + " " + user.surName}</strong></p>
                <p>
                Recover your password  
                <a href="${
                    process.env.ES_DOMAIN
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

    jwt.verify(token, process.env.ES_SECRET_KEY, (error) => {
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
                                isAdmin: doc.isAdmin,
                                name: doc.name,
                                surName: doc.surName,
                            },
                            process.env.ES_SECRET_KEY,
                            {
                                expiresIn: "20h",
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

// time-table
module.exports.getTimeTableData = async (req, res) => {
    const { classId } = req.params;

    console.log(req.params);

    try {
        const doc = await classModel.findOne(
            { _id: classId },
            { courses: { courseCode: 1, teacherId: 1 } }
        );
        let result;

        if (doc) {
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
            result = await Promise.all(promises);
        }

        res.json(result);
    } catch (e) {
        console.log(e);
        res.json([]);
    }
};

module.exports.newTimeTable = async (req, res) => {
    const { classId, program, week, year } = req.body;

    try {
        const user = await userModel.findOne({
            _id: req.user._id,
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
