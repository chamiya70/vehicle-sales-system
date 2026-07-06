const express = require("express");

const {
  createReservation,
  getAllReservations,
  getReservationById,
  updateReservation,
} = require("../controllers/reservationController");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  createReservation
);

router.get(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getAllReservations
);

router.get(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getReservationById
);

router.put(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  updateReservation
);

module.exports = router;