// services/admin.service.js
const {
  sequelize,
  Language,
  Subject,
  Grade,
  BacType,
  TutorRank,
  SessionType,
  Bundle,
  BundleItem,
  StudentProfile,
  TutorProfile,
  User,
} = require("../models");

/* ------------ include builders (use real aliases from models/index.js) ------------ */
function buildStudentInclude() {
  return [
    {
      model: StudentProfile,
      as: "studentProfile",
      attributes: [
        "id",
        "fullName",
        "guardianName",
        "phone",
        "guardianPhone",
        "dob",
        "address",
        "school",
        "createdAt",
      ],
      include: [
        { model: Grade, as: "grade", attributes: ["id", "name"] },
        { model: BacType, as: "bacTypes", attributes: ["id", "name"], through: { attributes: [] } },
        { model: Language, as: "languages", attributes: ["id", "name"], through: { attributes: [] } },
        { model: Subject, as: "subjects", attributes: ["id", "name"], through: { attributes: [] } },
      ],
    },
  ];
}

function buildTutorInclude() {
  return [
    {
      model: TutorProfile,
      as: "tutorProfile",
      attributes: [
        "id",
        "fullName",
        "phone",
        "dob",
        "address",
        "educationLevel",
        "availabilityHoursPerWeek",
        "preferredGradesText",
        "rankId",
        "idDocumentUrl",
        "idDocumentStatus",
        "idDocumentReviewedBy",
        "idDocumentReviewedAt",
        "idDocumentNotes",
        "createdAt",
      ],
      include: [
        { model: TutorRank, as: "rank", attributes: ["id", "name", "order"] },
        { model: Language, as: "languages", attributes: ["id", "name"], through: { attributes: [] } },
        { model: Subject, as: "subjects", attributes: ["id", "name"], through: { attributes: [] } },
        { model: BacType, as: "bacTypes", attributes: ["id", "name"], through: { attributes: [] } },
      ],
    },
  ];
}

/* ------------------------------ listUsers ------------------------------ */
async function listUsers({ role }) {
  const where = role ? { role } : {};
  const include =
    role === "tutor" ? buildTutorInclude()
    : role === "student" ? buildStudentInclude()
    : [];

  return User.findAll({
    where,
    attributes: ["id", "email", "role", "createdAt"],
    include,
    order: [["createdAt", "DESC"]],
  });
}

/* ------------------------------ Tutor ID review ------------------------------ */
async function listTutorIdRequests(status = "pending") {
  const where = {};
  if (status) where.idDocumentStatus = status;

  const tutors = await TutorProfile.findAll({
    where,
    include: [
      { model: User, as: "user", attributes: ["id", "email", "role"] },
      { model: TutorRank, as: "rank", attributes: ["id", "name", "order"] },
      { model: Language, as: "languages", attributes: ["id", "name"], through: { attributes: [] } },
      { model: Subject, as: "subjects", attributes: ["id", "name"], through: { attributes: [] } },
      { model: BacType, as: "bacTypes", attributes: ["id", "name"], through: { attributes: [] } },
    ],
    order: [["createdAt", "DESC"]],
  });

  return tutors;
}

async function reviewTutorIdDocument(adminUserId, tutorUserId, { status, notes }) {
  if (!["approved", "rejected"].includes(status)) {
    const e = new Error("Invalid status; must be 'approved' or 'rejected'");
    e.status = 400; throw e;
  }

  const profile = await TutorProfile.findOne({ where: { userId: tutorUserId } });
  if (!profile) { const e = new Error("Tutor profile not found"); e.status = 404; throw e; }

  await profile.update({
    idDocumentStatus: status,
    idDocumentReviewedBy: adminUserId,
    idDocumentReviewedAt: new Date(),
    idDocumentNotes: notes || null,
  });

  return TutorProfile.findByPk(profile.id, {
    include: [
      { model: User, as: "user", attributes: ["id", "email"] },
      { model: TutorRank, as: "rank", attributes: ["id", "name", "order"] },
    ],
  });
}

/* ------------------------------ simple CRUD (unchanged) ------------------------------ */
function crudSimple(Model, orderField = "name") {
  return {
    list: () => Model.findAll({ order: [[orderField, "ASC"]] }),
    create: (payload) => Model.create(payload),
    update: async (id, payload) => {
      const rec = await Model.findByPk(id);
      if (!rec) { const e = new Error("Not found"); e.status = 404; throw e; }
      await rec.update(payload);
      return rec;
    },
    remove: async (id) => {
      const count = await Model.destroy({ where: { id } });
      if (!count) { const e = new Error("Not found"); e.status = 404; throw e; }
      return { deleted: true };
    },
  };
}

const language = crudSimple(Language);
const subject = crudSimple(Subject);
const grade = crudSimple(Grade);
const bacType = crudSimple(BacType);
const tutorRank = crudSimple(TutorRank, "order");
const sessionType = crudSimple(SessionType);

/* ------------------------------ Bundles ------------------------------ */
const listBundles = () =>
  Bundle.findAll({
    order: [["name", "ASC"]],
    include: [{ model: BundleItem, as: "items", include: [{ model: SessionType, as: "sessionType" }] }],
  });

async function createBundle({ name, description, isActive = true, items }) {
  return sequelize.transaction(async (t) => {
    const bundle = await Bundle.create({ name, description, isActive }, { transaction: t });
    for (const it of items) {
      await BundleItem.create(
        { bundleId: bundle.id, sessionTypeId: it.sessionTypeId, hours: it.hours },
        { transaction: t }
      );
    }
    return Bundle.findByPk(bundle.id, {
      include: [{ model: BundleItem, as: "items", include: [{ model: SessionType, as: "sessionType" }] }],
      transaction: t,
    });
  });
}

async function updateBundle(id, { name, description, isActive, items }) {
  return sequelize.transaction(async (t) => {
    const bundle = await Bundle.findByPk(id, { transaction: t });
    if (!bundle) { const e = new Error("Not found"); e.status = 404; throw e; }

    await bundle.update({ name, description, isActive }, { transaction: t });

    if (Array.isArray(items)) {
      await BundleItem.destroy({ where: { bundleId: id }, transaction: t });
      for (const it of items) {
        await BundleItem.create(
          { bundleId: id, sessionTypeId: it.sessionTypeId, hours: it.hours },
          { transaction: t }
        );
      }
    }

    return Bundle.findByPk(id, {
      include: [{ model: BundleItem, as: "items", include: [{ model: SessionType, as: "sessionType" }] }],
      transaction: t,
    });
  });
}

async function removeBundle(id) {
  const count = await Bundle.destroy({ where: { id } });
  if (!count) { const e = new Error("Not found"); e.status = 404; throw e; }
  return { deleted: true };
}

module.exports = {
  // simple CRUD groups
  language,
  subject,
  grade,
  bacType,
  tutorRank,
  sessionType,

  // users & bundles
  listUsers,
  listBundles,
  createBundle,
  updateBundle,
  removeBundle,

  // ✅ Tutor ID verification (the missing exports)
  listTutorIdRequests,
  reviewTutorIdDocument,
};
