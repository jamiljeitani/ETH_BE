// controllers/lookups.controller.js
const svc = require('../services/lookup.service');

const languages = async (req, res, next) => { try { res.json(await svc.listLanguages()); } catch (e) { next(e); } };
const subjects  = async (req, res, next) => { try { res.json(await svc.listSubjects()); } catch (e) { next(e); } };
const grades    = async (req, res, next) => { try { res.json(await svc.listGrades()); } catch (e) { next(e); } };
const bacTypes  = async (req, res, next) => { try { res.json(await svc.listBacTypes()); } catch (e) { next(e); } };
const tutorRanks = async (req, res, next) => { try { res.json(await svc.listTutorRanks()); } catch (e) { next(e); } };
const sessions  = async (req, res, next) => { try { res.json(await svc.listSessionTypes()); } catch (e) { next(e); } };
const bundles   = async (req, res, next) => { try { res.json(await svc.listBundles()); } catch (e) { next(e); } };

module.exports = { languages, subjects, grades, bacTypes, tutorRanks, sessions, bundles };
