const jwt = require("jsonwebtoken");
// const Employee = require("../../../schemas/employee");
const User = require("../../../models/User");

const AuthLogin = async (req, res) => {
  const { email, password } = req.body;

  if (email && password) {
    await User.findOne(
      {
        email: email,
        password: password
      }

    )
      .exec()
      .then((result) => {
        if (result) {
          const token = jwt.sign(
            {
              email: email,
            },
            process.env.SMC_ACCESS_TOKEN_SECRET,
            { expiresIn: "12h" }
          );
          res.status(200).json({ token });
        } else {
          console.log("Access denied. Unauthorized user");
          res.status(401).json({ message: "Access denied. Unauthorized user" });
        }
      })
      .catch((error) => {
        return error;
      });
  } else {
    return res.status(401).json({ message: "Invalid username" });
  }
};

module.exports = AuthLogin;
