const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
    {
        courseCode: { type: String, required: true },
        specialization: { type: String, required: true },
        question: { type: String, required: true },
        answers: [
            {
                value: String,
                isCorrect: Boolean,
            },
        ],
        private: { type: Boolean },
        teacherId: { type: mongoose.Types.ObjectId, required: true },
        createdAt: { type: Date, default: Date.now },
    },

    {
        collection: "Questions",
    }
);

module.exports = mongoose.model("questionModel", questionSchema);
