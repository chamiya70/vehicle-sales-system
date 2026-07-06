const express = require("express");

const {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
} = require("../controllers/inquiryController");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

// Create inquiry
router.post("/", verifyToken, createInquiry);

// View inquiries
router.get(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getAllInquiries
);

router.get(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getInquiryById
);

// Update inquiry
router.put(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  updateInquiry
);

module.exports = router;