const { sql, poolPromise } = require("../config/db");

// CREATE RESERVATION
const createReservation = async (req, res) => {
  try {
    const {
      customer_id,
      vehicle_id,
      expiry_date,
      advance_amount,
      status,
    } = req.body;

    if (!customer_id || !vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "Customer ID and Vehicle ID are required",
      });
    }

    const pool = await poolPromise;

    // Check customer exists
    const customerResult = await pool
      .request()
      .input("customer_id", sql.Int, customer_id)
      .query(`
        SELECT customer_id 
        FROM customers 
        WHERE customer_id = @customer_id
      `);

    if (customerResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check vehicle exists and status
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

    if (vehicle.status === "Reserved" || vehicle.status === "Sold") {
      return res.status(409).json({
        success: false,
        message: `Vehicle is already ${vehicle.status}`,
      });
    }

    // Create reservation
    await pool
      .request()
      .input("customer_id", sql.Int, customer_id)
      .input("vehicle_id", sql.Int, vehicle_id)
      .input("reserved_by", sql.Int, req.user.user_id)
      .input("expiry_date", sql.DateTime, expiry_date || null)
      .input("advance_amount", sql.Decimal(18, 2), advance_amount || 0)
      .input("status", sql.VarChar, status || "Pending")
      .query(`
        INSERT INTO reservations (
          customer_id,
          vehicle_id,
          reserved_by,
          expiry_date,
          advance_amount,
          status
        )
        VALUES (
          @customer_id,
          @vehicle_id,
          @reserved_by,
          @expiry_date,
          @advance_amount,
          @status
        )
      `);

    // If reservation is approved immediately, update vehicle status
    if ((status || "Pending") === "Approved") {
      await pool
        .request()
        .input("vehicle_id", sql.Int, vehicle_id)
        .query(`
          UPDATE vehicles
          SET status = 'Reserved'
          WHERE vehicle_id = @vehicle_id
        `);
    }

    res.status(201).json({
      success: true,
      message: "Reservation created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create reservation",
      error: error.message,
    });
  }
};

// GET ALL RESERVATIONS
const getAllReservations = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        r.reservation_id,
        r.reservation_date,
        r.expiry_date,
        r.advance_amount,
        r.status,
        c.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        v.vehicle_id,
        v.brand,
        v.model,
        v.price,
        v.status AS vehicle_status,
        u.full_name AS reserved_by_name
      FROM reservations r
      INNER JOIN customers c ON r.customer_id = c.customer_id
      INNER JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      LEFT JOIN users u ON r.reserved_by = u.user_id
      ORDER BY r.reservation_date DESC
    `);

    res.json({
      success: true,
      count: result.recordset.length,
      reservations: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get reservations",
      error: error.message,
    });
  }
};

// GET ONE RESERVATION
const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("reservation_id", sql.Int, id)
      .query(`
        SELECT
          r.reservation_id,
          r.reservation_date,
          r.expiry_date,
          r.advance_amount,
          r.status,
          c.customer_id,
          c.full_name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email,
          v.vehicle_id,
          v.brand,
          v.model,
          v.price,
          v.status AS vehicle_status,
          u.full_name AS reserved_by_name
        FROM reservations r
        INNER JOIN customers c ON r.customer_id = c.customer_id
        INNER JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        LEFT JOIN users u ON r.reserved_by = u.user_id
        WHERE r.reservation_id = @reservation_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    res.json({
      success: true,
      reservation: result.recordset[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get reservation",
      error: error.message,
    });
  }
};

// UPDATE RESERVATION STATUS
const updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, expiry_date, advance_amount } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const allowedStatuses = [
      "Pending",
      "Approved",
      "Cancelled",
      "Expired",
      "Completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation status",
      });
    }

    const pool = await poolPromise;

    const existingReservation = await pool
      .request()
      .input("reservation_id", sql.Int, id)
      .query(`
        SELECT reservation_id, vehicle_id 
        FROM reservations 
        WHERE reservation_id = @reservation_id
      `);

    if (existingReservation.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    const reservation = existingReservation.recordset[0];

    await pool
      .request()
      .input("reservation_id", sql.Int, id)
      .input("status", sql.VarChar, status)
      .input("expiry_date", sql.DateTime, expiry_date || null)
      .input("advance_amount", sql.Decimal(18, 2), advance_amount || 0)
      .query(`
        UPDATE reservations
        SET 
          status = @status,
          expiry_date = @expiry_date,
          advance_amount = @advance_amount
        WHERE reservation_id = @reservation_id
      `);

    // Update vehicle status based on reservation status
    if (status === "Approved") {
      await pool
        .request()
        .input("vehicle_id", sql.Int, reservation.vehicle_id)
        .query(`
          UPDATE vehicles
          SET status = 'Reserved'
          WHERE vehicle_id = @vehicle_id
        `);
    }

    if (status === "Cancelled" || status === "Expired") {
      await pool
        .request()
        .input("vehicle_id", sql.Int, reservation.vehicle_id)
        .query(`
          UPDATE vehicles
          SET status = 'Available'
          WHERE vehicle_id = @vehicle_id
        `);
    }

    if (status === "Completed") {
      await pool
        .request()
        .input("vehicle_id", sql.Int, reservation.vehicle_id)
        .query(`
          UPDATE vehicles
          SET status = 'Sold'
          WHERE vehicle_id = @vehicle_id
        `);
    }

    res.json({
      success: true,
      message: "Reservation updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update reservation",
      error: error.message,
    });
  }
};

module.exports = {
  createReservation,
  getAllReservations,
  getReservationById,
  updateReservation,
};