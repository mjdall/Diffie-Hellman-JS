module.exports = {
  xorWithKey(message, key) {
    const keyLength = key.length;
    let resultantString = "";
    for (let cidx = 0; cidx < keyLength; cidx++) {
      const keyChar = key.charCodeAt(cidx % keyLength);
      resultantString =
        resultantString +
        String.fromCharCode(message.charCodeAt(cidx) ^ keyChar);
    }
    return resultantString;
  },
  getSuperSecretKey() {
    const fs = require("fs");
    // totally secure absolute address
    return fs.readFileSync("../super_secret_key", "utf8");
  }
};
