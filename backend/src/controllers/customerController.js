const {
  getCustomerById,
  updateCustomer,
} = require("../services/customerService");

// ============================================================
// GET CUSTOMER
// ============================================================

const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Security check
    // --------------------------------------------------------

    if (req.customerId !== id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this customer",
      });
    }

    const customer = await getCustomerById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
    });
  }
};

// ============================================================
// UPDATE CUSTOMER
// ============================================================

const updateCustomerProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Security check
    // --------------------------------------------------------

    if (req.customerId !== id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this customer",
      });
    }

    const customer = await updateCustomer(id, req.body);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
};

module.exports = {
  getCustomer,
  updateCustomerProfile,
};
