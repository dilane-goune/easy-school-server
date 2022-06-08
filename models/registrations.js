const mongoose = require("mongoose");

const { emailRegEx } = require("../assets/regex");

const registrationSchema = new mongoose.Schema(
    {
        email: { type: String, match: emailRegEx },
        telephone: { type: String, trim: true },
        name: { type: String, required: true, trim: true },
        surName: { type: String, required: true, trim: true },
        gender: { type: String, required: true },
        dateOfBirth: { type: Date, required: true },
        country: { code: String, name: String, phone: Number, flag: String },
        createdAt: { type: Date, default: Date.now },

        admissionLevel: { type: String },
        specialization: { type: String, required: true },
        classId: { type: mongoose.Types.ObjectId, required: true },

        IDCardFile: { type: String },
        certificateFile: { type: String },
    },
    {
        collection: "Registrations",
    }
);

registrationSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("registrationModel", registrationSchema);
