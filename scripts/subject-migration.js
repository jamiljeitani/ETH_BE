module.exports = {
    up: async (q, S) => q.addColumn('subjects', 'isActive', { type: S.BOOLEAN, allowNull: false, defaultValue: true }),
    down: (q) => q.removeColumn('subjects', 'isActive')
};