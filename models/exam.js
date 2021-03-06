const mongoose = require("mongoose");

const ExamSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        date: { type: Number, required: true },
        duration: { type: Number, required: true },
        totalScore: { type: Number, required: true },
        isWritten: { type: Boolean, default: false },
        year: { type: String },
        courseCode: { type: String, required: true },
        teacherId: { type: mongoose.Types.ObjectId, required: true },
        classId: { type: mongoose.Types.ObjectId, required: true },
        createdAt: { type: Date, default: Date.now },

        hasStarted: { type: Boolean, default: false },
        hasPassed: { type: Boolean, default: false },
        marks: [
            {
                userId: mongoose.Types.ObjectId,
                mark: Number,
            },
        ],
        questions: [
            {
                questionId: { type: mongoose.Types.ObjectId, required: true },
                correctPoints: { type: Number },
                wrongPoints: { type: Number },
            },
        ],
    },
    {
        collection: "Exams",
    }
);

module.exports = mongoose.model("examModel", ExamSchema);
