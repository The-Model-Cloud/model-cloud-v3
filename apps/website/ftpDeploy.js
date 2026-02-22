require("dotenv").config({ path: ".env.local" });
const FtpDeploy = require("ftp-deploy");
const path = require("path");

const ftpDeploy = new FtpDeploy();

const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: parseInt(process.env.FTP_PORT, 10) || 21,
  localRoot: path.join(__dirname, "out"),
  remoteRoot: process.env.FTP_REMOTE_ROOT || "/",
  include: ["*", "**/*", ".htaccess"],  // Include dotfiles like .htaccess
  deleteRemote: false,
  forcePasv: true,
};

console.log("Starting FTP deployment...");
console.log(`Local: ${config.localRoot}`);
console.log(`Remote: ${config.remoteRoot}`);

// Listen to deployment progress
ftpDeploy.on("uploading", function (data) {
  const percent = ((data.transferredFileCount / data.totalFilesCount) * 100).toFixed(2);
  console.log(`Uploading: ${data.filename} (${percent}%)`);
});

ftpDeploy.on("uploaded", function (data) {
  console.log(`✔ Uploaded: ${data.filename}`);
});

ftpDeploy
  .deploy(config)
  .then((res) => {
    console.log("✅ FTP Deploy Finished:", res);
  })
  .catch((err) => {
    console.error("❌ FTP Deploy Error:", err);
    process.exit(1);
  });
