const express = require("express");

const {
  createPayment,
  getAllPayments,
  getPaymentById,
} = require("../controllers/paymentController");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  createPayment
);

router.get(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getAllPayments
);

router.get(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getPaymentById
);

module.exports = router;