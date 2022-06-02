const agenda = require("./agenda");
const examModel = require("../models/exam");
const dayjs = require("dayjs");
const LocalizedFormat = require("dayjs/plugin/localizedFormat");
const { io } = require("./express");

dayjs.extend(LocalizedFormat);

module.exports.scheduleExam = async function (
    examId,
    examName,
    startDate,
    endDate,
    classId
) {
    const startJobName = "start-" + examId;
    const endJobName = "end-" + examId;

    agenda.define(startJobName, async () => {
        try {
            await examModel
                .updateOne({ _id: examId }, { $set: { hasStarted: true } })
                .then(() => {
                    return agenda.cancel({ name: startJobName });
                })
                .then((deletedCount) => {
                    console.log("exam started = > " + examName);
                    console.log("deletedCount = > " + deletedCount);
                });

            io.to(classId).emit("exam-start", { examId, examName });
        } catch (e) {
            console.log(e);
        }
    });

    agenda.define(endJobName, async () => {
        try {
            await examModel
                .updateOne(
                    { _id: examId },
                    {
                        $set: {
                            hasStarted: null,
                            hasPassed: true,
                            isWritten: true,
                        },
                    }
                )
                .then(() => {
                    return agenda.cancel({ name: endJobName });
                })
                .then((deletedCount) => {
                    console.log("exam ended = > " + examName);
                    console.log("deletedCount = > " + deletedCount);
                });
        } catch (e) {
            console.log(e);
        }
    });

    agenda.schedule(startDate, startJobName);
    agenda.schedule(endDate, endJobName);
};
