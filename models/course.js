const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        courseCode: { type: String, required: true },
        level: { type: String, required: true },
        color: { type: String, default: "#9c27b0" },
        chapters: [String],
    },

    {
        collection: "Courses",
    }
);

courseSchema.index({ name: 1, level: 1 }, { unique: true });
courseSchema.index({ courseCode: 1 }, { unique: true });

module.exports = mongoose.model("courseModel", courseSchema);
