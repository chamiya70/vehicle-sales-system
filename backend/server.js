const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { poolPromise } = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const saleRoutes = require("./routes/saleRoutes");
const testDriveRoutes = require("./routes/testDriveRoutes");

const verifyToken = require("./middleware/authMiddleware");
const checkRole = require("./middleware/roleMiddleware");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Basic server test route
app.get("/", (req, res) => {
  res.send("Vehicle Sales API is running...");
});

// Database connection test route
app.get("/api/test-db", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT name FROM sys.tables");

    res.json({
      success: true,
      message: "Database connected successfully",
      tables: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Vehicle routes
app.use("/api/vehicles", vehicleRoutes);

// Inquiry routes
app.use("/api/inquiries", inquiryRoutes);

// Reservation routes
app.use("/api/reservations", reservationRoutes);

// Payment routes
app.use("/api/payments", paymentRoutes);

// Sales routes
app.use("/api/sales", saleRoutes);

// Test Drive routes
app.use("/api/test-drives", testDriveRoutes);

// Protected route test
app.get("/api/protected-test", verifyToken, (req, res) => {
  res.json({
    success: true,
    message: "You accessed a protected route",
    user: req.user,
  });
});

// Admin-only route test
app.get("/api/admin-test", verifyToken, checkRole("Admin"), (req, res) => {
  res.json({
    success: true,
    message: "You accessed an Admin only route",
    user: req.user,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});