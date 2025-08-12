// services/admin.service.js
const { sequelize, Language, Subject, Grade, BacType, TutorRank, SessionType, Bundle, BundleItem } = require('../models');

function crudSimple(Model, orderField = 'name') {
  return {
    list: () => Model.findAll({ order: [[orderField, 'ASC']] }),
    create: (payload) => Model.create(payload),
    update: async (id, payload) => {
      const rec = await Model.findByPk(id);
      if (!rec) { const e = new Error('Not found'); e.status = 404; throw e; }
      await rec.update(payload);
      return rec;
    },
    remove: async (id) => {
      const count = await Model.destroy({ where: { id } });
      if (!count) { const e = new Error('Not found'); e.status = 404; throw e; }
      return { deleted: true };
    }
  };
}

const language   = crudSimple(Language);
const subject    = crudSimple(Subject);
const grade      = crudSimple(Grade);
const bacType    = crudSimple(BacType);
const tutorRank  = crudSimple(TutorRank, 'order');
const sessionType = crudSimple(SessionType);

// Bundles (with items)
const listBundles = () => Bundle.findAll({
  order: [['name', 'ASC']],
  include: [{ model: BundleItem, as: 'items', include: [{ model: SessionType, as: 'sessionType' }] }]
});

async function createBundle({ name, description, isActive = true, items }) {
  return sequelize.transaction(async (t) => {
    const bundle = await Bundle.create({ name, description, isActive }, { transaction: t });
    for (const it of items) {
      await BundleItem.create({ bundleId: bundle.id, sessionTypeId: it.sessionTypeId, hours: it.hours }, { transaction: t });
    }
    return Bundle.findByPk(bundle.id, {
      include: [{ model: BundleItem, as: 'items', include: [{ model: SessionType, as: 'sessionType' }] }],
      transaction: t
    });
  });
}

async function updateBundle(id, { name, description, isActive, items }) {
  return sequelize.transaction(async (t) => {
    const bundle = await Bundle.findByPk(id, { transaction: t });
    if (!bundle) { const e = new Error('Not found'); e.status = 404; throw e; }

    await bundle.update({ name, description, isActive }, { transaction: t });

    if (Array.isArray(items)) {
      await BundleItem.destroy({ where: { bundleId: id }, transaction: t });
      for (const it of items) {
        await BundleItem.create({ bundleId: id, sessionTypeId: it.sessionTypeId, hours: it.hours }, { transaction: t });
      }
    }

    return Bundle.findByPk(id, {
      include: [{ model: BundleItem, as: 'items', include: [{ model: SessionType, as: 'sessionType' }] }],
      transaction: t
    });
  });
}

async function removeBundle(id) {
  const count = await Bundle.destroy({ where: { id } });
  if (!count) { const e = new Error('Not found'); e.status = 404; throw e; }
  return { deleted: true };
}

module.exports = {
  language, subject, grade, bacType, tutorRank, sessionType,
  listBundles, createBundle, updateBundle, removeBundle
};
