const { sql, poolPromise } = require("../config/db");

// GET ALL VEHICLES
const getAllVehicles = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        vehicle_id,
        brand,
        model,
        manufacture_year,
        condition_type,
        fuel_type,
        transmission,
        mileage,
        engine_capacity,
        color,
        price,
        description,
        status,
        created_by,
        created_at
      FROM vehicles
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      count: result.recordset.length,
      vehicles: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get vehicles",
      error: error.message,
    });
  }
};

// GET ONE VEHICLE
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("vehicle_id", sql.Int, id)
      .query(`
        SELECT *
        FROM vehicles
        WHERE vehicle_id = @vehicle_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.json({
      success: true,
      vehicle: result.recordset[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get vehicle",
      error: error.message,
    });
  }
};

// ADD VEHICLE
const addVehicle = async (req, res) => {
  try {
    const {
      brand,
      model,
      manufacture_year,
      condition_type,
      fuel_type,
      transmission,
      mileage,
      engine_capacity,
      color,
      price,
      description,
      status,
    } = req.body;

    if (
      !brand ||
      !model ||
      !manufacture_year ||
      !condition_type ||
      !fuel_type ||
      !transmission ||
      !price
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Brand, model, manufacture year, condition type, fuel type, transmission, and price are required",
      });
    }

    const pool = await poolPromise;

    await pool
      .request()
      .input("brand", sql.VarChar, brand)
      .input("model", sql.VarChar, model)
      .input("manufacture_year", sql.Int, manufacture_year)
      .input("condition_type", sql.VarChar, condition_type)
      .input("fuel_type", sql.VarChar, fuel_type)
      .input("transmission", sql.VarChar, transmission)
      .input("mileage", sql.Int, mileage || 0)
      .input("engine_capacity", sql.VarChar, engine_capacity || null)
      .input("color", sql.VarChar, color || null)
      .input("price", sql.Decimal(18, 2), price)
      .input("description", sql.VarChar, description || null)
      .input("status", sql.VarChar, status || "Available")
      .input("created_by", sql.Int, req.user.user_id)
      .query(`
        INSERT INTO vehicles (
          brand,
          model,
          manufacture_year,
          condition_type,
          fuel_type,
          transmission,
          mileage,
          engine_capacity,
          color,
          price,
          description,
          status,
          created_by
        )
        VALUES (
          @brand,
          @model,
          @manufacture_year,
          @condition_type,
          @fuel_type,
          @transmission,
          @mileage,
          @engine_capacity,
          @color,
          @price,
          @description,
          @status,
          @created_by
        )
      `);

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add vehicle",
      error: error.message,
    });
  }
};

// UPDATE VEHICLE
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      brand,
      model,
      manufacture_year,
      condition_type,
      fuel_type,
      transmission,
      mileage,
      engine_capacity,
      color,
      price,
      description,
      status,
    } = req.body;

    const pool = await poolPromise;

    const existingVehicle = await pool
      .request()
      .input("vehicle_id", sql.Int, id)
      .query(`
        SELECT vehicle_id FROM vehicles
        WHERE vehicle_id = @vehicle_id
      `);

    if (existingVehicle.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    await pool
      .request()
      .input("vehicle_id", sql.Int, id)
      .input("brand", sql.VarChar, brand)
      .input("model", sql.VarChar, model)
      .input("manufacture_year", sql.Int, manufacture_year)
      .input("condition_type", sql.VarChar, condition_type)
      .input("fuel_type", sql.VarChar, fuel_type)
      .input("transmission", sql.VarChar, transmission)
      .input("mileage", sql.Int, mileage || 0)
      .input("engine_capacity", sql.VarChar, engine_capacity || null)
      .input("color", sql.VarChar, color || null)
      .input("price", sql.Decimal(18, 2), price)
      .input("description", sql.VarChar, description || null)
      .input("status", sql.VarChar, status || "Available")
      .query(`
        UPDATE vehicles
        SET
          brand = @brand,
          model = @model,
          manufacture_year = @manufacture_year,
          condition_type = @condition_type,
          fuel_type = @fuel_type,
          transmission = @transmission,
          mileage = @mileage,
          engine_capacity = @engine_capacity,
          color = @color,
          price = @price,
          description = @description,
          status = @status
        WHERE vehicle_id = @vehicle_id
      `);

    res.json({
      success: true,
      message: "Vehicle updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update vehicle",
      error: error.message,
    });
  }
};

// DELETE VEHICLE
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const existingVehicle = await pool
      .request()
      .input("vehicle_id", sql.Int, id)
      .query(`
        SELECT vehicle_id FROM vehicles
        WHERE vehicle_id = @vehicle_id
      `);

    if (existingVehicle.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    await pool
      .request()
      .input("vehicle_id", sql.Int, id)
      .query(`
        DELETE FROM vehicles
        WHERE vehicle_id = @vehicle_id
      `);

    res.json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete vehicle",
      error: error.message,
    });
  }
};

module.exports = {
  getAllVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
};