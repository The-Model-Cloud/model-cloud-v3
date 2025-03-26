require("dotenv").config();
const FtpDeploy = require("ftp-deploy");
const path = require("path");

const ftpDeploy = new FtpDeploy();

const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: parseInt(process.env.FTP_PORT, 10) || 21,
  localRoot: path.join(__dirname, "build"),
  remoteRoot: process.env.FTP_REMOTE_ROOT || "/",
  include: ["*", "**/*"], // everything inside build/
  deleteRemote: false,    // set to true to clear remote folder before upload
  forcePasv: true,
};

ftpDeploy
  .deploy(config)
  .then(res => console.log("✅ FTP Deploy Finished:", res))
  .catch(err => console.error("❌ FTP Deploy Error:", err));
