const mongoose = require("mongoose");

const ExamAnswersSchema = new mongoose.Schema(
    {
        examId: { type: mongoose.Types.ObjectId, required: true },
        userId: { type: mongoose.Types.ObjectId, required: true },
        questions: [
            {
                questionId: { type: mongoose.Types.ObjectId, required: true },
                answers: [
                    {
                        _id: { type: mongoose.Types.ObjectId, required: true },
                        response: Boolean,
                    },
                ],
            },
        ],
    },
    {
        collection: "ExamsAnswers",
    }
);

module.exports = mongoose.model("examAnswersModel", ExamAnswersSchema);
