const { sql, poolPromise } = require("../config/db");

// CREATE INQUIRY
const createInquiry = async (req, res) => {
  try {
    const { customer_id, vehicle_id, message } = req.body;

    if (!customer_id || !vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "Customer ID and Vehicle ID are required",
      });
    }

    const pool = await poolPromise;

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

    await pool
      .request()
      .input("customer_id", sql.Int, customer_id)
      .input("vehicle_id", sql.Int, vehicle_id)
      .input("message", sql.VarChar, message || null)
      .query(`
        INSERT INTO inquiries (customer_id, vehicle_id, message)
        VALUES (@customer_id, @vehicle_id, @message)
      `);

    res.status(201).json({
      success: true,
      message: "Inquiry created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create inquiry",
      error: error.message,
    });
  }
};

// GET ALL INQUIRIES
const getAllInquiries = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        i.inquiry_id,
        i.message,
        i.status,
        i.created_at,
        c.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        v.vehicle_id,
        v.brand,
        v.model,
        v.price,
        u.full_name AS assigned_staff_name
      FROM inquiries i
      INNER JOIN customers c ON i.customer_id = c.customer_id
      INNER JOIN vehicles v ON i.vehicle_id = v.vehicle_id
      LEFT JOIN users u ON i.assigned_staff_id = u.user_id
      ORDER BY i.created_at DESC
    `);

    res.json({
      success: true,
      count: result.recordset.length,
      inquiries: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get inquiries",
      error: error.message,
    });
  }
};

// GET ONE INQUIRY
const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("inquiry_id", sql.Int, id)
      .query(`
        SELECT
          i.inquiry_id,
          i.message,
          i.status,
          i.created_at,
          c.customer_id,
          c.full_name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email,
          v.vehicle_id,
          v.brand,
          v.model,
          v.price,
          u.full_name AS assigned_staff_name
        FROM inquiries i
        INNER JOIN customers c ON i.customer_id = c.customer_id
        INNER JOIN vehicles v ON i.vehicle_id = v.vehicle_id
        LEFT JOIN users u ON i.assigned_staff_id = u.user_id
        WHERE i.inquiry_id = @inquiry_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.json({
      success: true,
      inquiry: result.recordset[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get inquiry",
      error: error.message,
    });
  }
};

// UPDATE INQUIRY STATUS
const updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_staff_id } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const allowedStatuses = ["New", "Contacted", "Interested", "Closed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry status",
      });
    }

    const pool = await poolPromise;

    const existingInquiry = await pool
      .request()
      .input("inquiry_id", sql.Int, id)
      .query(`
        SELECT inquiry_id 
        FROM inquiries 
        WHERE inquiry_id = @inquiry_id
      `);

    if (existingInquiry.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    await pool
      .request()
      .input("inquiry_id", sql.Int, id)
      .input("status", sql.VarChar, status)
      .input("assigned_staff_id", sql.Int, assigned_staff_id || null)
      .query(`
        UPDATE inquiries
        SET 
          status = @status,
          assigned_staff_id = @assigned_staff_id
        WHERE inquiry_id = @inquiry_id
      `);

    res.json({
      success: true,
      message: "Inquiry updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update inquiry",
      error: error.message,
    });
  }
};

module.exports = {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
};