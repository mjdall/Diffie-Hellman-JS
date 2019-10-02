const flagMap = {
  ":d": "diffie-hellman",
  ":s": "symmetric-encryption",
  ":p": "plain-text"
};

const otherFlags = [":v", ":h"];

module.exports = {
  checkUserChannelChange(message) {
    if (!(message in flagMap)) {
      return undefined;
    }
    return flagMap[message];
  },
  getHelpMessage() {
    return (
      "Commands:\n" +
      "\t:d - enable diffie hellman encryption with the server" +
      "\t:s - enable symmetrix encryption with the server" +
      "\t:p - switch to plain-text mode" +
      "\t:v - enable verbose mode" +
      "\t:h - command help (this message)" +
      "\t:x - exit the program"
    );
  }
};
