const express = require("express");

const {
  getAllVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

// View vehicles
router.get("/", verifyToken, getAllVehicles);
router.get("/:id", verifyToken, getVehicleById);

// Manage vehicles
router.post(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  addVehicle
);

router.put(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  updateVehicle
);

router.delete(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  deleteVehicle
);

module.exports = router;