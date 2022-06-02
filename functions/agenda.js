const Agenda = require("agenda");

const agenda = new Agenda({
    db: { address: process.env.DATA_BASE, collection: "Agenda" },
    processEvery: "20 seconds",
    useUnifiedTopology: true,
});

module.exports = agenda;
