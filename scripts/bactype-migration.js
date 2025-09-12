module.exports = {
    up: (q, S) => q.addColumn('bac_types', 'description', { type: S.TEXT, allowNull: true }),
    down: (q) => q.removeColumn('bac_types', 'description')
};
