const jwt = require("jsonwebtoken");

const {
  findCustomerByEmail,
  findCustomerById,
  createCustomer,
  verifyPassword,
} = require("../services/authService");

// ============================================================
// GENERATE JWT
// ============================================================

const generateToken = (customer) => {
  return jwt.sign(
    {
      customerId: customer.id,
      email: customer.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

// ============================================================
// LOGIN
// ============================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const customer = await findCustomerByEmail(email);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // If password_hash is not available
    if (!customer.password_hash) {
      return res.status(500).json({
        success: false,
        message: "This account does not have a password configured.",
      });
    }

    const passwordValid = await verifyPassword(
      password,
      customer.password_hash,
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(customer);

    res.json({
      success: true,
      message: "Login successful",
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        age: customer.age,
        gender: customer.gender,
        location: customer.location,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// ============================================================
// REGISTER
// ============================================================

const register = async (req, res) => {
  try {
    const { name, email, password, age, gender, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters",
      });
    }

    const existingCustomer = await findCustomerByEmail(email);

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const customerId = `CUST${Date.now()}`;

    const customer = await createCustomer({
      id: customerId,
      name,
      email,
      password,
      age,
      gender,
      location,
    });

    const token = generateToken(customer);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      customer,
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// ============================================================
// CURRENT USER
// ============================================================

const getMe = async (req, res) => {
  try {
    const customer = await findCustomerById(req.customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get current customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
    });
  }
};

module.exports = {
  login,
  register,
  getMe,
};
