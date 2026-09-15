const {
  getRecommendationsByCustomer,
  getOrRefreshRecommendations,
  saveRecommendationFeedback,
} = require("../services/recommendationService");

// ============================================================
// GET RECOMMENDATIONS
// ============================================================

const getRecommendations = async (req, res) => {
  try {
    const { customerId } = req.params;

    // --------------------------------------------------------
    // Authorization
    // --------------------------------------------------------

    if (req.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access these recommendations",
      });
    }

    // --------------------------------------------------------
    // Get current recommendations.
    //
    // If new feedback exists after the last recommendation
    // generation, the service automatically generates a
    // fresh recommendation batch.
    // --------------------------------------------------------

    const recommendations = await getOrRefreshRecommendations(customerId);

    return res.status(200).json({
      success: true,
      customerId,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Get recommendations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
    });
  }
};

// ============================================================
// SUBMIT RECOMMENDATION FEEDBACK
// ============================================================

const submitRecommendationFeedback = async (req, res) => {
  try {
    const { recommendationId, productId, feedback } = req.body;

    // ------------------------------------------------------
    // Validate product
    // ------------------------------------------------------

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // ------------------------------------------------------
    // Validate feedback
    // ------------------------------------------------------

    if (feedback !== "helpful" && feedback !== "not_helpful") {
      return res.status(400).json({
        success: false,
        message: "Feedback must be 'helpful' or 'not_helpful'",
      });
    }

    // ------------------------------------------------------
    // Save feedback
    // ------------------------------------------------------

    const savedFeedback = await saveRecommendationFeedback({
      customerId: req.customerId,

      recommendationId: recommendationId || null,

      productId,

      feedback,
    });

    return res.status(201).json({
      success: true,
      message: "Recommendation feedback saved",

      feedback: savedFeedback,
    });
  } catch (error) {
    console.error("Recommendation feedback error:", error);

    // ------------------------------------------------------
    // Handle validation errors more accurately
    // ------------------------------------------------------

    if (
      error.message === "Recommendation does not belong to this customer" ||
      error.message === "Product does not match the recommendation"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save recommendation feedback",
    });
  }
};

module.exports = {
  getRecommendations,
  submitRecommendationFeedback,
};
