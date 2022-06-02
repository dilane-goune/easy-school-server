const mongoose = require("mongoose");

const timeTableCourse = {
    courseCode: String,
    courseName: String,
    teacherName: String,
    teacherDiplomat: String,
};

const courseDays = {
    monday: timeTableCourse,
    tuesday: timeTableCourse,
    wednesday: timeTableCourse,
    thursday: timeTableCourse,
    friday: timeTableCourse,
    saturday: timeTableCourse,
    sunday: timeTableCourse,
};

const timeTableSchema = new mongoose.Schema(
    {
        year: { type: String, required: true },
        week: { type: String, required: true },
        classId: { type: mongoose.Types.ObjectId, required: true },
        program: {
            p1: courseDays,
            p2: courseDays,
            p3: courseDays,
            p4: courseDays,
        },
    },
    {
        collection: "TimeTables",
    }
);

module.exports = mongoose.model("timeTableModel", timeTableSchema);
