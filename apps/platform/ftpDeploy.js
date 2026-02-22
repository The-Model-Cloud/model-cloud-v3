require("dotenv").config();
const FtpDeploy = require("ftp-deploy");
const path = require("path");
const notifier = require("node-notifier");

const ftpDeploy = new FtpDeploy();

const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: parseInt(process.env.FTP_PORT, 10) || 21,
  localRoot: path.join(__dirname, "build"),
  remoteRoot: process.env.FTP_REMOTE_ROOT || "/",
  include: ["*", "**/*"],
  deleteRemote: false,
  forcePasv: true,
};

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
  .then(res => {
    console.log("✅ FTP Deploy Finished:", res);
    notifier.notify({
      title: "FTP Deploy",
      message: "Deployment complete!",
      sound: true,
    });
  })
  .catch(err => {
    console.error("❌ FTP Deploy Error:", err);
    notifier.notify({
      title: "FTP Deploy Failed",
      message: err.message || "Something went wrong",
      sound: true,
    });
    process.exit(1);
  });
