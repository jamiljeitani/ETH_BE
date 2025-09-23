// backend/services/support.service.js
module.exports = ({ SupportMessage }) => {
  return {
    async create({ userId, role, subject, message }) {
      return await SupportMessage.create({ userId, role, subject, message });
    },

    async listByUser(userId) {
      return await SupportMessage.findAll({
        where: { userId },
        order: [["created_at", "DESC"]],
      });
    },
  };
};
