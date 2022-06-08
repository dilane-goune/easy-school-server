const mongoose = require("mongoose");

const timeTableSchema = new mongoose.Schema(
    {
        year: { type: String, required: true },
        week: { type: String, required: true },
        classId: { type: mongoose.Types.ObjectId, required: true },
        program: {},
    },
    {
        collection: "TimeTables",
    }
);

timeTableSchema.index({ year: 1, week: 1, classId: 1 }, { unique: 1 });

module.exports = mongoose.model("timeTableModel", timeTableSchema);
