const express = require("express");
const router = express.Router();

const tf_controller = require("../controllers/tf_controller");

router.get("/CreateModel", tf_controller.create_model);
router.get("/GetPredictionTest", tf_controller.get_prediction_test);
router.get("/dbtest", tf_controller.database_test);

module.exports = router;