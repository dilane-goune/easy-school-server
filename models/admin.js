const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
    {
        userName: { type: String, required: true },
        password: { type: String, required: true },
    },
    { collection: "Admins" }
);

module.exports = mongoose.model("adminModel", adminSchema);
