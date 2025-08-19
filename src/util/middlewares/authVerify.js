const jwt = require("jsonwebtoken");
require("dotenv").config();

const authVerify = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).send("Access denied. Unauthorized access.");
  }

  try {
    const { email, permissions } = jwt.verify(
      token,
      process.env.SMC_ACCESS_TOKEN_SECRET
    );

    req.query.Branch = permissions.branch.includes(req.query.Branch)
      ? req.query.Branch
      : permissions.branch[0];
    next();
    return;
  } catch (error) {
    return res.status(401).send("Access denied." + error.message);
  }
};

module.exports = authVerify;
