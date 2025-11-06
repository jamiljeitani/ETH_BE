// controllers/students.controller.js
const studentSvc = require("../services/student.service");
const changeSvc = require("../services/change-request.service");
const { imagekit } = require("../lib/imagekit");
const crypto = require("node:crypto");

async function getMe(req, res, next) {
  try {
    const profile = await studentSvc.getMe(req.user.id);
    res.json({ profile });
  } catch (e) {
    next(e);
  }
}

async function putMe(req, res, next) {
  try {
    const profile = await studentSvc.upsertMe(req.user.id, req.body);
    res.json({ profile, message: "Student profile saved." });
  } catch (e) {
    next(e);
  }
}

// Helper: robust mime sniffing (dynamic import to support CJS)
async function sniffFileType(buffer) {
  try {
    const { fileTypeFromBuffer } = await import("file-type");
    return await fileTypeFromBuffer(buffer);
  } catch {
    return null;
  }
}

async function uploadAvatarOnlyUrl(req, res, next) {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: { message: "No file uploaded" } });
    }

    // Accept images only for avatars
    const detected = await sniffFileType(file.buffer);
    const okMimes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!detected || !okMimes.has(detected.mime)) {
      return res.status(400).json({ error: { message: "Invalid image type" } });
    }

    const ext = detected.ext === "jpeg" ? "jpg" : detected.ext;
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const folder = `/avatars/${req.user.id}`;

    // ImageKit (or your existing storage)
    if (!imagekit) {
      return res.status(503).json({
        error: {
          message:
            "Image upload service not configured. Please contact support.",
        },
      });
    }

    const upload = await imagekit.upload({
      file: file.buffer.toString("base64"),
      fileName,
      folder,
    });

    return res.status(201).json({ avatarUrl: upload?.url });
  } catch (e) {
    next(e);
  }
}

async function createTutorChangeRequest(req, res, next) {
  try {
    const rec = await changeSvc.createRequest(req.user.id, req.body);
    res
      .status(201)
      .json({ request: rec, message: "Your request was submitted." });
  } catch (e) {
    next(e);
  }
}
async function listMyTutorChangeRequests(req, res, next) {
  try {
    const recs = await changeSvc.listMyRequests(req.user.id);
    res.json({ requests: recs });
  } catch (e) {
    next(e);
  }
}

async function getMyConsumption(req, res, next) {
  try {
    const svc = require("../services/consumption.service");
    const data = await svc.listStudentPurchasesWithConsumption(req.user.id);

    console.log("🧾 [getMyConsumption] Raw service data type:", typeof data);
    console.log(
      "🧾 [getMyConsumption] Raw service data preview:",
      JSON.stringify(data, null, 2).slice(0, 500)
    );

    // Defensive normalization
    let purchases = [];
    if (Array.isArray(data)) {
      purchases = data;
    } else if (data && typeof data === "object") {
      // Sometimes service returns { purchases: [...] } or a single record
      if (Array.isArray(data.purchases)) purchases = data.purchases;
      else purchases = [data];
    } else {
      purchases = [];
    }

    const { transformPurchasesData } = require("../utils/purchaseTransformer");

    const transformedData = purchases.map((item) => ({
      ...item,
      purchase: transformPurchasesData(
        Array.isArray(item.purchase) ? item.purchase : [item.purchase || {}]
      )[0],
    }));

    res.json(transformedData);
  } catch (e) {
    console.error("🔥 [getMyConsumption] ERROR:", e);
    next(e);
  }
}

async function getMyConsumptionHistory(req, res, next) {
  try {
    const svc = require("../services/consumption.service");
    const { purchaseId, limit, offset } = req.query;
    const items = await svc.listStudentConsumptionHistory(req.user.id, {
      purchaseId,
      limit,
      offset,
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getMe,
  putMe,
  uploadAvatarOnlyUrl,
  createTutorChangeRequest,
  listMyTutorChangeRequests,
  getMyConsumption,
  getMyConsumptionHistory,
};
