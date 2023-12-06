
export default {
    /** Size of lookup table for curve */
    CURVE_LUT_POINTS: 100,
    /** In narrow phase it restricts time parameter accuracy for projection onto curve */
    CURVE_PROJECT_T_EPSILON: 1e-5,

    /** Debugging: draw curve's control polygon */
    DRAW_CURVE_POLY: true,
    /** Debugging: draw curve's lookup table */
    DRAW_CURVE_LUT: true,
    /** Debugging: draw curve's normal at lookup points */
    DRAW_CURVE_LUT_NORM: true
};
