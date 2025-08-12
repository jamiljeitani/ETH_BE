// services/lookup.service.js
const { Language, Subject, Grade, BacType, TutorRank, SessionType, Bundle, BundleItem } = require('../models');

const listLanguages = () => Language.findAll({ order: [['name', 'ASC']] });
const listSubjects  = () => Subject.findAll({ order: [['name', 'ASC']] });
const listGrades    = () => Grade.findAll({ order: [['name', 'ASC']] });
const listBacTypes  = () => BacType.findAll({ order: [['name', 'ASC']] });
const listTutorRanks = () => TutorRank.findAll({ order: [['order', 'ASC']] });
const listSessionTypes = () => SessionType.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
const listBundles = () => Bundle.findAll({
  where: { isActive: true },
  order: [['name', 'ASC']],
  include: [{ model: BundleItem, as: 'items', include: [{ model: SessionType, as: 'sessionType' }] }]
});

module.exports = { listLanguages, listSubjects, listGrades, listBacTypes, listTutorRanks, listSessionTypes, listBundles };
