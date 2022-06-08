const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        teacherId: { type: mongoose.Types.ObjectId, required: true },
        classId: { type: mongoose.Types.ObjectId, required: true },
        courseCode: { type: String, required: true },
        title: { type: String, required: true },
        body: { type: String },
        teacherName: { type: String },
        createdAt: { type: Date, default: Date.now },
        files: [{ fileName: String, mimeType: String, size: String }],
    },
    {
        collection: "Documents",
    }
);

module.exports = mongoose.model("documentModel", documentSchema);
