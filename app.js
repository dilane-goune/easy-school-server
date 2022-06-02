const mongoose = require("mongoose");
const multer = require("multer");
require("dotenv").config();

// middlewares
const studentAuth = require("./middlewares/studentAuth");
const teacherAuth = require("./middlewares/teacherAuth");
const userAuth = require("./middlewares/userAuth");
const adminAuth = require("./middlewares/adminAuth");

// routes
const userRoute = require("./routes/user");
const adminRoute = require("./routes/admin");

// model
const specialisationModel = require("./models/specialisation");

const agenda = require("./functions/agenda");
const { app } = require("./functions/express");
const { registrationStorage } = require("./functions/multer");

// port
const API = process.env.API;

// db connection
try {
    mongoose.connect(
        process.env.DATA_BASE || "mongodb://localhost/easy-school"
    );
} catch (e) {
    console.log("FAILED TO CONNECT TO DATABASE");
    console.log(e);
    process.exit(0);
}

// start agenda
(async function () {
    await agenda.start(); // Start Agenda instance
})();

const registrationsFileUploads = multer({ storage: registrationStorage });

// user
app.post(API + "/token/extend", userRoute.extendToken);

app.post(API + "/login", userRoute.login);

// registration
app.post(
    API + "/registration",
    registrationsFileUploads.fields([
        { name: "IDCardFile", maxCount: 1 },
        { name: "certificateFile", maxCount: 1 },
    ]),
    userRoute.newRegistration
);
app.get(API + "/registration-data", userRoute.getRegistrationData);
app.post(API + "/finish-registration/", userRoute.finishRegistration);
app.get(
    API + "/get-registration-info/:studentId",
    userRoute.getFinishRegistrationInfo
);

// courses
app.get(API + "/courses/:classId/", studentAuth, userRoute.getStudentCourses);
app.get(API + "/courses/", teacherAuth, userRoute.getTeacherCourses);

app.get(
    API + "/courses/:courseCode/:classId/:teacherId",
    userAuth,
    userRoute.getOneCourse
);

// exams
app.get(API + "/exams/:classId", userAuth, userRoute.getExams);
app.get(
    API + "/exams/questions/:specialization/:courseCode",
    teacherAuth,
    userRoute.getExamsQuestions
);
app.get(API + "/exams", userAuth, userRoute.getExams);
app.post(API + "/exams", teacherAuth, userRoute.newExam);

app.get(API + "/exams/write/:examId", studentAuth, userRoute.getFullExam);
app.post(API + "/exams/write/", studentAuth, userRoute.submitExam);

// questions
app.get(API + "/questions", teacherAuth, userRoute.getQuestions);
app.post(API + "/questions", teacherAuth, userRoute.newQuestion);
app.delete(
    API + "/questions/:questionId",
    teacherAuth,
    userRoute.deleteQuestion
);

// time-table
app.get(
    API + "/time-tables/data/:classId",
    teacherAuth,
    userRoute.getTimeTableData
);
app.get(API + "/time-tables", userAuth, userRoute.getTimeTable);
app.post(API + "/time-tables", teacherAuth, userRoute.newTimeTable);

// *

app.get(API + "/specializations", (req, res) => {
    specialisationModel
        .find()
        .then((docs) => res.json(docs))
        .catch(() => res.json([]));
});

app.post(API + "/get-recovery-code", userRoute.getRecoveryCode);
app.post(API + "/confirm-recovery-code", userRoute.confirmRecoveryCode);

// admin
app.post(API + "/admin/login", adminRoute.login);
app.post(API + "/admin/token/extend", adminRoute.extendToken);

// admin-classes
app.get(API + "/admin/classes", adminAuth, adminRoute.getClasses);
app.post(API + "/admin/classes", adminAuth, adminRoute.newClass);
app.put(API + "/admin/classes/:classId", adminAuth, adminRoute.updateClass);

// admin-teachers
app.get(API + "/admin/teachers", adminAuth, adminRoute.getTeachers);
app.post(API + "/admin/teachers", adminAuth, adminRoute.newTeacher);

// admin-courses

app.get(API + "/admin/registrations", adminAuth, adminRoute.getRegitrations);
app.get(
    API + "/admin/registrations/:id",
    adminAuth,
    adminRoute.getOneRegitration
);
app.put(
    API + "/admin/registrations/:studentId/:classId",
    adminAuth,
    adminRoute.confirmStudent
);
app.delete(
    API + "/admin/registrations/:id",
    adminAuth,
    adminRoute.rejectStudent
);

app.post(API + "/admin/initialize-academic-year", adminAuth, (req, res) =>
    res.sendStatus(200)
);

app.get(API + "/admin", adminAuth, adminRoute.getTeachers);
app.post(API + "/admin", adminAuth, adminRoute.newTeacher);

app.get(API + "/admin/courses", adminAuth, adminRoute.getCourses);
app.post(API + "/admin/courses", adminAuth, adminRoute.newCourse);

// const test = app.get("/", (req, res) => res.send("hello time out"));
