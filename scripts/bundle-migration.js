module.exports = {
    up: (q, S) => Promise.all([
        q.addColumn('bundles', 'totalPrice', { type: S.DECIMAL(10,2), allowNull: true }),
        q.addColumn('bundles', 'validityDays', { type: S.INTEGER, allowNull: true })
    ]),
    down: (q) => Promise.all([
        q.removeColumn('bundles', 'totalPrice'),
        q.removeColumn('bundles', 'validityDays')
    ])
};
