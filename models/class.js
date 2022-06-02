const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        level: { type: String, required: true },
        specialization: { type: String, required: true },
        classMasterId: { type: mongoose.Types.ObjectId, trim: true },
        courses: [
            {
                courseCode: { type: String, required: true },
                credit: { type: Number, required: true },
                teacherId: { type: mongoose.Types.ObjectId, required: true },
                time: {
                    theory: Number,
                    practices: Number,
                    exercises: Number,
                },
                sessions: [
                    {
                        date: { type: Date, required: true },
                        duration: { type: Number, required: true },
                    },
                ],
            },
        ],
    },

    {
        collection: "Classes",
    }
);

classSchema.index({ name: 1 }, { unique: true });
classSchema.index({ level: 1, specialization: 1 }, { unique: true });

module.exports = mongoose.model("classModel", classSchema);
