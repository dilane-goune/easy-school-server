const userModel = require("../models/user");
const notificationsModel = require("../models/notifications");

module.exports.getNotifications = async (userId, classId) => {
    try {
        const user = await userModel.findOne({ _id: userId }, { lastLogin: 1 });
        const notifications = await notificationsModel.find(
            {
                $or: [{ classId }, { _id: userId }],
                createdAt: { $gte: new Date(user?.lastLogin) },
            },
            { _id: 0, __v: 0 }
        );

        return notifications;
    } catch (e) {
        console.log(e);
        return undefined;
    }
};
