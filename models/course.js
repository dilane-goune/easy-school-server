const mongoose = require("mongoose");

const colors = ["#ed6c02", "#ff9800", "#9c27b0", "#2e7d32", "#01579b"];

const courseSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        courseCode: { type: String, required: true },
        level: { type: String, required: true },
        color: {
            type: String,
            default: colors[Math.round(Math.random() * 10) % colors.length],
        },
        chapters: [String],
    },

    {
        collection: "Courses",
    }
);

courseSchema.index({ name: 1, level: 1 }, { unique: true });
courseSchema.index({ courseCode: 1 }, { unique: true });

module.exports = mongoose.model("courseModel", courseSchema);
