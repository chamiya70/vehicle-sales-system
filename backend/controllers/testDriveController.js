const { sql, poolPromise } = require("../config/db");

// CREATE TEST DRIVE
const createTestDrive = async (req, res) => {
  try {
    const {
      customer_id,
      vehicle_id,
      assigned_staff_id,
      test_drive_date,
      test_drive_time,
      notes,
    } = req.body;

    if (!customer_id || !vehicle_id || !test_drive_date || !test_drive_time) {
      return res.status(400).json({
        success: false,
        message:
          "Customer ID, Vehicle ID, test drive date, and test drive time are required",
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

    // Check vehicle exists
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
        message: "Cannot schedule test drive. Vehicle is already sold",
      });
    }

    // Create test drive
    await pool
      .request()
      .input("customer_id", sql.Int, customer_id)
      .input("vehicle_id", sql.Int, vehicle_id)
      .input("assigned_staff_id", sql.Int, assigned_staff_id || req.user.user_id)
      .input("test_drive_date", sql.Date, test_drive_date)
      .input("test_drive_time", sql.Time, test_drive_time)
      .input("status", sql.VarChar, "Pending")
      .input("notes", sql.VarChar, notes || null)
      .query(`
        INSERT INTO test_drives (
          customer_id,
          vehicle_id,
          assigned_staff_id,
          test_drive_date,
          test_drive_time,
          status,
          notes
        )
        VALUES (
          @customer_id,
          @vehicle_id,
          @assigned_staff_id,
          @test_drive_date,
          @test_drive_time,
          @status,
          @notes
        )
      `);

    res.status(201).json({
      success: true,
      message: "Test drive scheduled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to schedule test drive",
      error: error.message,
    });
  }
};

// GET ALL TEST DRIVES
const getAllTestDrives = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        td.test_drive_id,
        td.test_drive_date,
        td.test_drive_time,
        td.status,
        td.notes,
        c.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        v.vehicle_id,
        v.brand,
        v.model,
        v.price,
        v.status AS vehicle_status,
        u.full_name AS assigned_staff_name
      FROM test_drives td
      INNER JOIN customers c ON td.customer_id = c.customer_id
      INNER JOIN vehicles v ON td.vehicle_id = v.vehicle_id
      LEFT JOIN users u ON td.assigned_staff_id = u.user_id
      ORDER BY td.test_drive_date DESC, td.test_drive_time DESC
    `);

    res.json({
      success: true,
      count: result.recordset.length,
      test_drives: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get test drives",
      error: error.message,
    });
  }
};

// GET ONE TEST DRIVE
const getTestDriveById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("test_drive_id", sql.Int, id)
      .query(`
        SELECT
          td.test_drive_id,
          td.test_drive_date,
          td.test_drive_time,
          td.status,
          td.notes,
          c.customer_id,
          c.full_name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email,
          v.vehicle_id,
          v.brand,
          v.model,
          v.price,
          v.status AS vehicle_status,
          u.full_name AS assigned_staff_name
        FROM test_drives td
        INNER JOIN customers c ON td.customer_id = c.customer_id
        INNER JOIN vehicles v ON td.vehicle_id = v.vehicle_id
        LEFT JOIN users u ON td.assigned_staff_id = u.user_id
        WHERE td.test_drive_id = @test_drive_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test drive not found",
      });
    }

    res.json({
      success: true,
      test_drive: result.recordset[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get test drive",
      error: error.message,
    });
  }
};

// UPDATE TEST DRIVE STATUS
const updateTestDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_staff_id, test_drive_date, test_drive_time, notes } =
      req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const allowedStatuses = ["Pending", "Scheduled", "Completed", "Cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test drive status",
      });
    }

    const pool = await poolPromise;

    const existingTestDrive = await pool
      .request()
      .input("test_drive_id", sql.Int, id)
      .query(`
        SELECT test_drive_id
        FROM test_drives
        WHERE test_drive_id = @test_drive_id
      `);

    if (existingTestDrive.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test drive not found",
      });
    }

    await pool
      .request()
      .input("test_drive_id", sql.Int, id)
      .input("status", sql.VarChar, status)
      .input("assigned_staff_id", sql.Int, assigned_staff_id || req.user.user_id)
      .input("test_drive_date", sql.Date, test_drive_date || null)
      .input("test_drive_time", sql.Time, test_drive_time || null)
      .input("notes", sql.VarChar, notes || null)
      .query(`
        UPDATE test_drives
        SET
          status = @status,
          assigned_staff_id = @assigned_staff_id,
          test_drive_date = ISNULL(@test_drive_date, test_drive_date),
          test_drive_time = ISNULL(@test_drive_time, test_drive_time),
          notes = @notes
        WHERE test_drive_id = @test_drive_id
      `);

    res.json({
      success: true,
      message: "Test drive updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update test drive",
      error: error.message,
    });
  }
};

module.exports = {
  createTestDrive,
  getAllTestDrives,
  getTestDriveById,
  updateTestDrive,
};