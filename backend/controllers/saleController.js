const { sql, poolPromise } = require("../config/db");

// CREATE SALE
const createSale = async (req, res) => {
  try {
    const {
      reservation_id,
      customer_id,
      vehicle_id,
      final_price,
      payment_status,
    } = req.body;

    if (!reservation_id || !customer_id || !vehicle_id || !final_price) {
      return res.status(400).json({
        success: false,
        message:
          "Reservation ID, Customer ID, Vehicle ID, and Sale Price are required",
      });
    }

    const allowedPaymentStatuses = ["Pending", "Partial", "Paid"];

    if (payment_status && !allowedPaymentStatuses.includes(payment_status)) {
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

    const reservation = reservationResult.recordset[0];

    // Make sure sale belongs to same customer and vehicle in reservation
    if (
      Number(reservation.customer_id) !== Number(customer_id) ||
      Number(reservation.vehicle_id) !== Number(vehicle_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer or vehicle does not match the reservation",
      });
    }

    // Check if sale already exists for this reservation
    const existingSale = await pool
      .request()
      .input("reservation_id", sql.Int, reservation_id)
      .query(`
        SELECT sale_id
        FROM sales
        WHERE reservation_id = @reservation_id
      `);

    if (existingSale.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Sale already completed for this reservation",
      });
    }

    // Check vehicle status
    const vehicleResult = await pool
      .request()
      .input("vehicle_id", sql.Int, vehicle_id)
      .query(`
        SELECT vehicle_id, status
        FROM vehicles
        WHERE vehicle_id = @vehicle_id
      `);

    if (vehicleResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    const vehicle = vehicleResult.recordset[0];

    if (vehicle.status === "Sold") {
      return res.status(409).json({
        success: false,
        message: "Vehicle is already sold",
      });
    }

    // Insert sale
    await pool
      .request()
      .input("reservation_id", sql.Int, reservation_id)
      .input("customer_id", sql.Int, customer_id)
      .input("vehicle_id", sql.Int, vehicle_id)
      .input("sold_by", sql.Int, req.user.user_id)
      .input("final_price", sql.Decimal(18, 2), final_price)
      .input("payment_status", sql.VarChar, payment_status || "Paid")
      .query(`
        INSERT INTO sales (
          reservation_id,
          customer_id,
          vehicle_id,
          sold_by,
          final_price,
          payment_status
        )
        VALUES (
          @reservation_id,
          @customer_id,
          @vehicle_id,
          @sold_by,
          @final_price,
          @payment_status
        )
      `);

    // Update vehicle status to Sold
    await pool
      .request()
      .input("vehicle_id", sql.Int, vehicle_id)
      .query(`
        UPDATE vehicles
        SET status = 'Sold'
        WHERE vehicle_id = @vehicle_id
      `);

    // Update reservation status to Completed
    await pool
      .request()
      .input("reservation_id", sql.Int, reservation_id)
      .query(`
        UPDATE reservations
        SET status = 'Completed'
        WHERE reservation_id = @reservation_id
      `);

    res.status(201).json({
      success: true,
      message: "Sale completed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to complete sale",
      error: error.message,
    });
  }
};

// GET ALL SALES
const getAllSales = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        s.sale_id,
        s.reservation_id,
        s.sale_date,
        s.final_price,
        s.payment_status,
        c.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        v.vehicle_id,
        v.brand,
        v.model,
        v.manufacture_year,
        v.price AS vehicle_price,
        v.status AS vehicle_status,
        u.full_name AS sold_by_name
      FROM sales s
      INNER JOIN customers c ON s.customer_id = c.customer_id
      INNER JOIN vehicles v ON s.vehicle_id = v.vehicle_id
      LEFT JOIN users u ON s.sold_by = u.user_id
      ORDER BY s.sale_date DESC
    `);

    res.json({
      success: true,
      count: result.recordset.length,
      sales: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get sales",
      error: error.message,
    });
  }
};

// GET ONE SALE
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("sale_id", sql.Int, id)
      .query(`
        SELECT
          s.sale_id,
          s.reservation_id,
          s.sale_date,
          s.final_price,
          s.payment_status,
          c.customer_id,
          c.full_name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email,
          v.vehicle_id,
          v.brand,
          v.model,
          v.manufacture_year,
          v.price AS vehicle_price,
          v.status AS vehicle_status,
          u.full_name AS sold_by_name
        FROM sales s
        INNER JOIN customers c ON s.customer_id = c.customer_id
        INNER JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        LEFT JOIN users u ON s.sold_by = u.user_id
        WHERE s.sale_id = @sale_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    res.json({
      success: true,
      sale: result.recordset[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get sale",
      error: error.message,
    });
  }
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
};