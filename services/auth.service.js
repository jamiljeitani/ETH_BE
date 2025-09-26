// services/auth.service.js
const dayjs = require('dayjs');
const { User,StudentProfile,TutorProfile, EmailVerification, PasswordResetToken } = require('../models');
const { hashPassword, comparePassword, randomToken } = require('../utils/crypto');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { verifyEmailTemplate, resetPasswordTemplate } = require('../utils/emailTemplates');
const { sendVerifyEmail, sendResetEmail } = require('./email.service');
const { ROLES, USER_STATUS } = require('../utils/constants');

const VERIFY_EXPIRES_HOURS = 24;
const RESET_EXPIRES_HOURS = 1;

function sanitizeUser(u, extras = {}) {
    return {
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        emailVerifiedAt: u.emailVerifiedAt,
        preferredLanguage: u.preferredLanguage || 'en',
        createdAt: u.createdAt,
        profilePictureUrl: extras.profilePictureUrl ?? null,
        idDocumentUrl: extras.idDocumentUrl ?? null,
        walletAmount: extras.walletAmount ?? null,
    };
}

async function signup({ email, password, role }) {
  if (![ROLES.STUDENT, ROLES.TUTOR].includes(role)) {
    const err = new Error('Invalid role'); err.status = 400; throw err;
  }
  const exists = await User.findOne({ where: { email } });
  if (exists) { const e = new Error('Email already in use'); e.status = 409; throw e; }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, role, status: USER_STATUS.ACTIVE });

  const token = randomToken(32);
  await EmailVerification.create({
    userId: user.id,
    token,
    expiresAt: dayjs().add(VERIFY_EXPIRES_HOURS, 'hour').toDate()
  });

  const tpl = verifyEmailTemplate({ token });
  await sendVerifyEmail(user.email, tpl.subject, tpl.html);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[VERIFY TOKEN]', token);
  }

  return sanitizeUser(user);
}

async function verifyEmail({ token }) {
  const rec = await EmailVerification.findOne({ where: { token } });
  if (!rec) { const e = new Error('Invalid token'); e.status = 400; throw e; }
  if (dayjs(rec.expiresAt).isBefore(dayjs())) {
    await rec.destroy(); const e = new Error('Token expired'); e.status = 400; throw e;
  }
  const user = await User.findByPk(rec.userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  user.emailVerifiedAt = new Date();
  await user.save();
  await rec.destroy();
  return sanitizeUser(user);
}

async function login({ email, password }) {
  const user = await User.findOne({ where: { email } });
  const invalid = () => { const e = new Error('Invalid credentials'); e.status = 401; throw e; };
  if (!user) invalid();

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) invalid();

  if (!user.emailVerifiedAt) { const e = new Error('Email not verified'); e.status = 403; throw e; }
  if (user.status !== USER_STATUS.ACTIVE) { const e = new Error('User disabled'); e.status = 403; throw e; }

  const payload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

async function refresh({ refreshToken }) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findByPk(payload.sub);
    if (!user) throw new Error('User not found');
    if (user.status !== USER_STATUS.ACTIVE) throw new Error('User disabled');

    const newAccess = signAccessToken({ sub: user.id, role: user.role });
    const newRefresh = signRefreshToken({ sub: user.id, role: user.role });
    return { accessToken: newAccess, refreshToken: newRefresh };
  } catch {
    const e = new Error('Invalid refresh token'); e.status = 401; throw e;
  }
}

async function forgotPassword({ email }) {
  const user = await User.findOne({ where: { email } });
  if (!user) return; // don’t leak
  const token = randomToken(32);
  await PasswordResetToken.create({
    userId: user.id,
    token,
    expiresAt: dayjs().add(RESET_EXPIRES_HOURS, 'hour').toDate()
  });
  const tpl = resetPasswordTemplate({ token });
  await sendResetEmail(email, tpl.subject, tpl.html);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[RESET TOKEN]', token);
  }
}

async function resetPassword({ token, newPassword }) {
  const rec = await PasswordResetToken.findOne({ where: { token } });
  if (!rec) { const e = new Error('Invalid token'); e.status = 400; throw e; }
  if (dayjs(rec.expiresAt).isBefore(dayjs())) {
    await rec.destroy(); const e = new Error('Token expired'); e.status = 400; throw e;
  }
  const user = await User.findByPk(rec.userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await rec.destroy();
  return sanitizeUser(user);
}

async function updateUserPreferences(userId, preferences) {
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  await user.update(preferences);
  return sanitizeUser(user);
}

async function getUserPreferences(userId) {
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  return {
    preferredLanguage: user.preferredLanguage || 'en'
  };
}

async function getUserById(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
        const e = new Error('User not found');
        e.status = 404;
        throw e;
    }

    // Attach profile fields based on role
    let profilePictureUrl = null;
    let idDocumentUrl = null;
    let walletAmount = null;

    if (user.role === 'student') {
        const sp = await StudentProfile.findOne({ where: { userId: user.id } });
        if (sp) {
            profilePictureUrl = sp.profilePictureUrl || null;
            // students don’t have idDocumentUrl by design; keep null
        }
    } else if (user.role === 'tutor') {
        const tp = await TutorProfile.findOne({ where: { userId: user.id } });
        if (tp) {
            profilePictureUrl = tp.profilePictureUrl || null;
            idDocumentUrl = tp.idDocumentUrl || null;
            walletAmount = tp.walletAmount ?? null;
        }
    }

    return sanitizeUser(user, { profilePictureUrl, idDocumentUrl, walletAmount });
}

module.exports = { signup, verifyEmail, login, refresh, forgotPassword, resetPassword, updateUserPreferences, getUserPreferences, getUserById };
