module.exports = {
  xorWithKey(message, key) {
    key = key.toString();
    const keyLength = key.length;
    let resultantString = '';
    for (let charIdx = 0; charIdx < message.length; charIdx++) {
      // mod it by key length to wrap our key around
      const keyChar = key.charCodeAt(charIdx % keyLength).toString(10);
      const messageChar = message.charCodeAt(charIdx).toString(10);

      resultantString += String.fromCharCode(keyChar ^ messageChar);
    }
    return resultantString;
  },
  getSuperSecretKey() {
    const fs = require('fs');
    // totally secure absolute address
    return fs.readFileSync('../super_secret_key', 'utf8');
  }
};
