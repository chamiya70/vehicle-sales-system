const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../config/db");

// REGISTER USER
const register = async (req, res) => {
  try {
    const { username, email, password, full_name, phone, role_id } = req.body;

    if (!username || !email || !password || !full_name || !role_id) {
      return res.status(400).json({
        success: false,
        message: "Username, email, password, full name, and role are required",
      });
    }

    const pool = await poolPromise;

    const existingUser = await pool
      .request()
      .input("username", sql.VarChar, username)
      .input("email", sql.VarChar, email)
      .query(`
        SELECT * FROM users 
        WHERE username = @username OR email = @email
      `);

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("username", sql.VarChar, username)
      .input("email", sql.VarChar, email)
      .input("password", sql.VarChar, hashedPassword)
      .input("full_name", sql.VarChar, full_name)
      .input("phone", sql.VarChar, phone || null)
      .input("role_id", sql.Int, role_id)
      .query(`
        INSERT INTO users (username, email, password, full_name, phone, role_id)
        VALUES (@username, @email, @password, @full_name, @phone, @role_id)
      `);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// LOGIN USER
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query(`
        SELECT 
          u.user_id,
          u.username,
          u.email,
          u.password,
          u.full_name,
          u.phone,
          u.status,
          r.role_name
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE u.email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.recordset[0];

    if (user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role_name,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
};