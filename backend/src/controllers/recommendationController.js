const {
  getRecommendationsByCustomer,
  generateRecommendationsForCustomer,
} = require("../services/recommendationService");

/**
 * GET /api/recommendations/:customerId
 *
 * Returns recommendations for the logged-in customer.
 */
const getRecommendations = async (req, res) => {
  try {
    const { customerId } = req.params;

    // ----------------------------------------------------------
    // Security check
    // ----------------------------------------------------------

    if (req.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access these recommendations",
      });
    }

    // ----------------------------------------------------------
    // Get recommendations
    // ----------------------------------------------------------

    let recommendations = await getRecommendationsByCustomer(customerId);

    if (recommendations.length === 0) {
      recommendations = await generateRecommendationsForCustomer(customerId);

      if (recommendations.length === 0) {
        const stored = await getRecommendationsByCustomer(customerId);
        recommendations = stored;
      }
    }

    // ----------------------------------------------------------
    // Response
    // ----------------------------------------------------------

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

module.exports = {
  getRecommendations,
};
