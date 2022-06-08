const mongoose = require("mongoose");

const { emailRegEx } = require("../assets/regex");

const userSchema = new mongoose.Schema(
    {
        email: { type: String, match: emailRegEx },
        password: { type: String, default: "" },
        telephone: { type: String, trim: true },
        name: { type: String, required: true, trim: true },
        surName: { type: String, required: true, trim: true },
        gender: { type: String, required: true },
        dateOfBirth: { type: Date, required: true },
        country: { code: String, name: String, phone: Number, flag: String },
        createdAt: { type: Date, default: Date.now },
        lastLogin: { type: Date },
        lastSeen: { type: Date },
        isTeacher: { type: Boolean, default: false },
        isAdmin: { type: Boolean, default: false },
        diplomat: { type: String },

        classId: { type: mongoose.Types.ObjectId },
        specialization: { type: String, required: true },

        suspended: { type: Boolean, default: false },
        recoveryCode: { type: String },

        pp: String,
        courses: [
            {
                courseCode: { type: String, required: true },
                classId: { type: mongoose.Types.ObjectId, required: true },
            },
        ],
    },
    {
        collection: "Users",
    }
);

userSchema.pre("save", async function (next) {
    this.pp = this.gender == "M" ? "male.jpg" : "female.jpg";
    next();
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ email: 1, isTeacher: 1 }, { unique: true });

module.exports = mongoose.model("userModel", userSchema);
