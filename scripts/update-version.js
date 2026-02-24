const fs = require("fs");
const path = require("path");

// Generate version in YY.MM.DD.HHMM format
const now = new Date();
const version = [
  String(now.getFullYear()).slice(-2),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0"),
].join(".");

const versionFile = path.join(__dirname, "..", "apps", "platform", "src", "version.js");
const content = `const version = "v${version}";\nexport default version;\n`;

fs.writeFileSync(versionFile, content);
console.log(`Version updated to v${version}`);
