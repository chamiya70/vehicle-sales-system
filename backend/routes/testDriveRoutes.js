const express = require("express");

const {
  createTestDrive,
  getAllTestDrives,
  getTestDriveById,
  updateTestDrive,
} = require("../controllers/testDriveController");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  createTestDrive
);

router.get(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getAllTestDrives
);

router.get(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getTestDriveById
);

router.put(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  updateTestDrive
);

module.exports = router;