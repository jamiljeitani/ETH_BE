// controllers/feedback.controller.js
const svc = require('../services/feedback.service');
const { Purchase, User, Bundle, SessionType, Assignment } = require('../models');

async function create(req, res, next) {
  try {
    const rec = await svc.create(req.user, req.body);
    res.status(201).json({ feedback: rec, message: 'Feedback recorded.' });
  } catch (e) { next(e); }
}

async function getPurchaseController(req, res, next) {
    try {
        const { id } = req.body || {};
        if (!id) {
            return res.status(400).json({ error: 'id is required' });
        }

        const me = req.user;
        if (!me) {
            return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Sign in required' });
        }

        // Load the purchase with safe includes (student/bundle/sessionType if they exist)
        const A = Purchase.associations || {};
        const include = [];
        if (A.student)     include.push({ model: User, as: 'student', attributes: ['id', 'email'] });
        if (A.bundle && Bundle) include.push({ model: Bundle, as: 'bundle', attributes: ['id', 'name', 'description'] });
        if (A.sessionType && SessionType) include.push({ model: SessionType, as: 'sessionType', attributes: ['id', 'name', 'description', 'sessionHours'] });

        const purchase = await Purchase.findByPk(id, {
            attributes: { exclude: ['deletedAt'] },
            include
        });
        if (!purchase) {
            return res.status(404).json({ code: 'NOT_FOUND', message: 'Purchase not found' });
        }

        // Determine active/most-recent assignment (tutor linkage)
        let assignment = null;
        try {
            const where = { purchaseId: purchase.id };
            // Prefer active first; fall back to latest if no status field
            assignment = await Assignment.findOne({
                where,
                order: [['status', 'DESC'], ['updatedAt', 'DESC'], ['createdAt', 'DESC']].filter(Boolean)
            });
        } catch (e) {
            // Assignment model may not have status; fallback to simple latest
            assignment = await Assignment.findOne({
                where: { purchaseId: purchase.id },
                order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']]
            });
        }

        let tutor = null;
        if (assignment && assignment.tutorId) {
            tutor = await User.findByPk(assignment.tutorId, { attributes: ['id', 'email'] });
        }

        // Ownership check
        const studentIds = [
            purchase.studentId
        ].filter(Boolean).map(String);

        const isStudentOwner = studentIds.includes(String(me.id));
        const isTutorOnAssignment = assignment && String(assignment.tutorId) === String(me.id);
        const role = (me.role && (me.role.name || me.role)) || null;
        const isAdmin = role && String(role).toLowerCase() === 'admin';

        if (!isStudentOwner && !isTutorOnAssignment && !isAdmin) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient role' });
        }

        // Shape response and attach `tutor` for the frontend decoration
        const json = purchase.toJSON();
        if (tutor) json.tutor = tutor;

        return res.json({ purchase: json });
    } catch (err) {
        next(err);
    }
};

module.exports = { create, getPurchaseController };
