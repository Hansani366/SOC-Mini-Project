const express = require("express");
const router = express.Router();
const Record = require("../models/Record");

// POST - Save new record
router.post("/", async (req, res) => {
  try {
    const record = new Record({
      user: req.user ? req.user._id : null,
      apiKeyUsed: req.headers["x-api-key"] || "unknown",
      data: req.body
    });
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to save record", details: err.message });
  }
});

// GET - Fetch all records
router.get("/", async (req, res) => {
  try {
    const records = await Record.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch records", details: err.message });
  }
});

// DELETE - Clear all records
router.delete("/", async (req, res) => {
  try {
    await Record.deleteMany({});
    res.json({ message: "All records cleared" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete records", details: err.message });
  }
});

module.exports = router;
