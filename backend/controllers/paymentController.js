const { sql, poolPromise } = require("../config/db");

// CREATE PAYMENT
const createPayment = async (req, res) => {
  try {
    const {
      reservation_id,
      amount,
      payment_method,
      payment_status,
    } = req.body;

    if (!reservation_id || !amount || !payment_method) {
      return res.status(400).json({
        success: false,
        message: "Reservation ID, amount, and payment method are required",
      });
    }

    const allowedMethods = ["Cash", "Card", "Bank Transfer", "Online"];
    const allowedStatuses = ["Pending", "Paid", "Failed", "Refunded"];

    if (!allowedMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    if (payment_status && !allowedStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const pool = await poolPromise;

    // Check reservation exists
    const reservationResult = await pool
      .request()
      .input("reservation_id", sql.Int, reservation_id)
      .query(`
        SELECT reservation_id, customer_id, vehicle_id, status
        FROM reservations
        WHERE reservation_id = @reservation_id
      `);

    if (reservationResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    await pool
      .request()
      .input("reservation_id", sql.Int, reservation_id)
      .input("amount", sql.Decimal(18, 2), amount)
      .input("payment_method", sql.VarChar, payment_method)
      .input("payment_status", sql.VarChar, payment_status || "Paid")
      .query(`
        INSERT INTO payments (
          reservation_id,
          amount,
          payment_method,
          payment_status
        )
        VALUES (
          @reservation_id,
          @amount,
          @payment_method,
          @payment_status
        )
      `);

    res.status(201).json({
      success: true,
      message: "Payment added successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add payment",
      error: error.message,
    });
  }
};

// GET ALL PAYMENTS
const getAllPayments = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        p.payment_id,
        p.reservation_id,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.payment_date,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        v.brand,
        v.model,
        v.price
      FROM payments p
      INNER JOIN reservations r ON p.reservation_id = r.reservation_id
      INNER JOIN customers c ON r.customer_id = c.customer_id
      INNER JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      ORDER BY p.payment_date DESC
    `);

    res.json({
      success: true,
      count: result.recordset.length,
      payments: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get payments",
      error: error.message,
    });
  }
};

// GET ONE PAYMENT
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("payment_id", sql.Int, id)
      .query(`
        SELECT
          p.payment_id,
          p.reservation_id,
          p.amount,
          p.payment_method,
          p.payment_status,
          p.payment_date,
          c.full_name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email,
          v.brand,
          v.model,
          v.price
        FROM payments p
        INNER JOIN reservations r ON p.reservation_id = r.reservation_id
        INNER JOIN customers c ON r.customer_id = c.customer_id
        INNER JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        WHERE p.payment_id = @payment_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      payment: result.recordset[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get payment",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getAllPayments,
  getPaymentById,
};