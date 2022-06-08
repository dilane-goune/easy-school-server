const mongoose = require("mongoose");

const courseSessionSchema = new mongoose.Schema(
    {
        date: { type: Date, default: Date.now },
        courseCode: { type: String, required: true },
        classId: { type: mongoose.Types.ObjectId, trim: true },
        teacherId: { type: mongoose.Types.ObjectId, trim: true },
        presentStudents: [mongoose.Types.ObjectId],
    },

    {
        collection: "CourseSessions",
    }
);

module.exports = mongoose.model("courseSessionModel", courseSessionSchema);
