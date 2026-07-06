const express = require("express");

const {
  createSale,
  getAllSales,
  getSaleById,
} = require("../controllers/saleController");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  createSale
);

router.get(
  "/",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getAllSales
);

router.get(
  "/:id",
  verifyToken,
  checkRole("Admin", "Manager", "Sales Staff"),
  getSaleById
);

module.exports = router;