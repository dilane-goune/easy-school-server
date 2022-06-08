const mongoose = require("mongoose");
require("dotenv").config();
require("./functions/socket.io");
require("./functions/peerJs");

// middlewares
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
const multerStorage = require("./functions/multer");

// port
const API = process.env.ES_API;

// db connection
try {
    mongoose.connect(
        process.env.ES_DATA_BASE || "mongodb://localhost/easy-school"
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

// user
app.post(API + "/token/extend", userRoute.extendToken);
app.post(API + "/login", userRoute.login);
app.get(API + "/profile-data", userRoute.getProfileData);

app.post(
    API + "/user/profile-pictures",
    userAuth,
    multerStorage.profilePictures.single("pp"),
    userRoute.updatePP
);
app.delete(API + "/user/profile-pictures", userAuth, userRoute.removePP);

// registration
app.post(
    API + "/registration",
    multerStorage.registrations.fields([
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
app.get(API + "/courses/:classId/", userAuth, userRoute.getStudentCourses);
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

app.get(API + "/exams/write/:examId", userAuth, userRoute.getFullExam);
app.post(API + "/exams/write/", userAuth, userRoute.submitExam);
app.get(API + "/exams/result/:examId/", userAuth, userRoute.getExamsResult);

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

// documents
app.post(
    API + "/documents/:courseCode/:classId",
    multerStorage.documents.array("files"),
    teacherAuth,
    userRoute.newCourseDoucument
);
app.delete(API + "/documents/:id", teacherAuth, userRoute.deleteDocument);

// *

app.get(API + "/specializations", (req, res) => {
    specialisationModel
        .find()
        .then((docs) => res.json(docs))
        .catch(() => res.json([]));
});

app.post(API + "/get-recovery-code", userRoute.getRecoveryCode);
app.post(API + "/confirm-recovery-code", userRoute.confirmRecoveryCode);

// ADMIN

// admin-classes
app.get(API + "/admin/classes", adminAuth, adminRoute.getClasses);
app.post(API + "/admin/classes", adminAuth, adminRoute.newClass);
app.put(API + "/admin/classes/:classId", adminAuth, adminRoute.updateClass);

// admin-teachers
app.get(API + "/admin/teachers", adminAuth, adminRoute.getTeachers);
app.post(API + "/admin/teachers", adminAuth, adminRoute.newTeacher);

// admin-registrations
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

// admin-teachers
app.get(API + "/admin", adminAuth, adminRoute.getTeachers);
app.post(API + "/admin", adminAuth, adminRoute.newTeacher);

// admin-courses
app.get(API + "/admin/courses", adminAuth, adminRoute.getCourses);
app.post(API + "/admin/courses", adminAuth, adminRoute.newCourse);
app.put(API + "/admin/courses", adminAuth, adminRoute.updateCourse);

// admin-specializations
app.get(
    API + "/admin/specializations",
    adminAuth,
    adminRoute.getSpecializations
);
app.post(
    API + "/admin/specializations",
    adminAuth,
    adminRoute.newSpecialization
);
app.delete(
    API + "/admin/specializations/:id",
    adminAuth,
    adminRoute.deleteSpecialization
);
