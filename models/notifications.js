const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Types.ObjectId },
        classId: { type: mongoose.Types.ObjectId },
        primary: { type: String, trim: true, required: "true" },
        secondary: { type: String, trim: true },
        type: { type: String },
        createdAt: { type: Date, default: Date.now },
    },
    {
        collection: "Notifications",
    }
);

module.exports = mongoose.model("notificationModel", notificationSchema);
