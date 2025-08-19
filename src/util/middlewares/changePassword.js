const jwt = require("jsonwebtoken");
// const Employee = require("../../../schemas/employee");
const User = require("../../../models/User");

const ChangePassword = (req, res) => {
  const { previousPassword, newPassword } = req.body;
  const email = req.headers.email;

  if (email && previousPassword && newPassword) {
    User.findOne({
      email: email,
      password: previousPassword,
    })
      .exec()
      .then((result) => {
        if (result) {
          // Update the password
          User.updateOne(
            { email: email },
            { $set: { password: newPassword } }
          )
            .then(() => {
              console.log("Password updated successfully");
              res.status(200).json({ message: "Password updated successfully" });
            })
            .catch((error) => {
              console.error("Error updating password:", error);
              res.status(500).json({ message: "Error updating password" });
            });
        } else {
          res.status(401).json({ message: "Previous password didn't match" });
        }
      })
      .catch((error) => {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Error finding user" });
      });
  } else {
    return res.status(400).json({ message: "Invalid input" });
  }
};

module.exports = ChangePassword;