const mongoose = require("mongoose");

const specializationSchema = new mongoose.Schema(
    {
        name: String,
    },

    {
        collection: "Specializations",
    }
);

specializationSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("specializationModel", specializationSchema);
