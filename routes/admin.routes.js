// routes/admin.routes.js
const router = require("express").Router();

const ctrl = require("../controllers/admin.controller");
const admin = require("../controllers/admin.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

// Defensive schema loads (optional)
let adminSchema = {};
let reportSchema = {};
let paymentSchema = {};
try { adminSchema = require("../validators/admin.schema"); } catch { /* noop */ }
try { reportSchema = require("../validators/reports.schema"); } catch { /* noop */ }
try { paymentSchema = require("../validators/payment.schema"); } catch { /* noop */ }

// No-op validator if schema is missing
const safeValidate = (schema, location = "body") =>
  schema ? validate(schema, location) : (req, res, next) => next();

// Ensure a controller exists; otherwise return 501
const ensureCtrl = (name) =>
  (typeof ctrl?.[name] === "function")
    ? ctrl[name]
    : (req, res) => res.status(501).json({
        error: { code: "NOT_IMPLEMENTED", message: `Admin controller '${name}' not implemented` }
      });

// Protect ALL admin routes
router.use(authMiddleware, requireRole("admin"));

/* ---------- Languages ---------- */
router.get("/languages", ensureCtrl("listLanguages"));
router.post("/languages", safeValidate(adminSchema.createLanguage), ensureCtrl("createLanguage"));
router.put(
  "/languages/:id",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.updateLanguage),
  ensureCtrl("updateLanguage")
);
router.delete(
  "/languages/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("deleteLanguage")
);

/* ---------- Subjects ---------- */
router.get("/subjects", ensureCtrl("listSubjects"));
router.post("/subjects", safeValidate(adminSchema.createSubject), ensureCtrl("createSubject"));
router.put(
  "/subjects/:id",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.updateSubject),
  ensureCtrl("updateSubject")
);
router.delete(
  "/subjects/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("deleteSubject")
);

/* ---------- Grades ---------- */
router.get("/grades", ensureCtrl("listGrades"));
router.post("/grades", safeValidate(adminSchema.createGrade), ensureCtrl("createGrade"));
router.put(
  "/grades/:id",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.updateGrade),
  ensureCtrl("updateGrade")
);
router.delete(
  "/grades/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("deleteGrade")
);

/* ---------- Bac Types ---------- */
router.get("/bac-types", ensureCtrl("listBacTypes"));
router.post("/bac-types", safeValidate(adminSchema.createBacType), ensureCtrl("createBacType"));
router.put(
  "/bac-types/:id",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.updateBacType),
  ensureCtrl("updateBacType")
);
router.delete(
  "/bac-types/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("deleteBacType")
);

/* ---------- Tutor Ranks ---------- */
router.get("/tutor-ranks", ensureCtrl("listTutorRanks"));
router.post("/tutor-ranks", safeValidate(adminSchema.createTutorRank), ensureCtrl("createTutorRank"));
router.put(
  "/tutor-ranks/:id",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.updateTutorRank),
  ensureCtrl("updateTutorRank")
);
router.delete(
  "/tutor-ranks/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("deleteTutorRank")
);

/* ---------- Sessions (SessionType) ---------- */
router.get("/sessions", ensureCtrl("listSessions"));
router.get("/sessions/count", ensureCtrl("countSessions")); // counts
router.post("/sessions", safeValidate(adminSchema.createSession), ensureCtrl("createSession")); // ✅ schema key
router.put(
  "/sessions/:id",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.updateSession), // ✅ schema key
  ensureCtrl("updateSession")
);
router.delete(
  "/sessions/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("deleteSession")
);

/* ---------- Bundles ---------- */
router.get("/bundles", ensureCtrl("listBundles"));
router.post("/bundles", safeValidate(adminSchema.createBundle), ensureCtrl("createBundle"));
router.put(
  "/bundles/:id",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.updateBundle),
  ensureCtrl("updateBundle")
);
router.delete(
  "/bundles/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("deleteBundle")
);

/* ---------- Assignments ---------- */
router.get(
  "/assignments",
  safeValidate(adminSchema.queryAssignments, "query"),
  ensureCtrl("listAssignments")
);
router.post(
  "/assignments",
  safeValidate(adminSchema.createAssignment),
  ensureCtrl("createAssignment")
);
router.put(
  "/assignments/:id",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.updateAssignment),
  ensureCtrl("updateAssignment")
);
router.delete(
  "/assignments/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("deleteAssignment")
);

/* ---------- Tutor change requests ---------- */
router.get("/tutor-change-requests", ensureCtrl("listChangeRequests"));
router.patch(
  "/tutor-change-requests/:id",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.decisionChangeRequest),
  ensureCtrl("decideChangeRequest")
);

/* ---------- Feedback (admin-only) ---------- */
router.get(
  "/feedback",
  safeValidate(adminSchema.feedbackListQuery, "query"),
  ensureCtrl("listFeedback")
);

/* ---------- Manual Payments ---------- */
router.get(
  "/payments",
  safeValidate(paymentSchema?.adminListQuery, "query"),
  ensureCtrl("listManualPayments")
);
router.patch(
  "/payments/:transactionId/approve",
  safeValidate(paymentSchema?.adminDecisionParams, "params"),
  safeValidate(paymentSchema?.adminDecisionBody, "body"),
  ensureCtrl("approveManualPayment")
);
router.patch(
  "/payments/:transactionId/reject",
  safeValidate(paymentSchema?.adminDecisionParams, "params"),
  safeValidate(paymentSchema?.adminDecisionBody, "body"),
  ensureCtrl("rejectManualPayment")
);

/* ---------- Reports ---------- */
router.get(
  "/reports/consumption",
  safeValidate(reportSchema.consumptionQuery, "query"),
  ensureCtrl("reportConsumption")
);
router.get(
  "/reports/payouts",
  safeValidate(reportSchema.payoutsQuery, "query"),
  ensureCtrl("reportPayouts")
);

/* ---------- Users & Purchases (Assignments support) ---------- */
router.get("/users/count", ensureCtrl("countUsers"));
router.get("/users", admin.listUsers);

// NEW: deep detail for Admin drawer
router.get("/users/:id", ensureCtrl("getUser"));

router.get(
  "/students/:id/purchases",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("listStudentPurchases")
);

/* ---------- Generic Users (Dashboard actions) ---------- */
router.patch(
  "/users/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("updateUser")
);
router.delete(
  "/users/:id",
  safeValidate(adminSchema.idParam, "params"),
  ensureCtrl("deleteUser")
);

/* ---------- Dashboard ---------- */
router.get("/dashboard/stats", ensureCtrl("getDashboardStats"));
router.get("/dashboard/recent-students", ensureCtrl("getRecentStudents"));
router.get("/dashboard/recent-tutors", ensureCtrl("getRecentTutors"));

/* ---------- Tutor Ranks analytics & assignment ---------- */
router.get("/tutor-ranks/usage", ensureCtrl("getTutorRankUsage"));
router.patch(
  "/tutors/:id/rank",
  safeValidate(adminSchema.idParam, "params"),
  safeValidate(adminSchema.assignRankBody, "body"),
  ensureCtrl("assignTutorRank")
);



module.exports = router;


/* ---------- Tutor Wallet ---------- */
router.get('/tutors/:id/wallet', ensureCtrl('getTutorWallet'));
router.post('/tutors/:id/wallet/withdraw', ensureCtrl('withdrawTutorWallet'));



// Wallet withdraw requests
router.get('/withdrawals', ensureCtrl('listWithdrawRequests'));
router.post('/withdrawals/:id/paid', ensureCtrl('markWithdrawPaid'));
router.post('/withdrawals/:id/cancel', ensureCtrl('cancelWithdrawRequest'));
