getRandomInt = (lowerBound, upperBound) =>
  Math.round(Math.random() * (upperBound - lowerBound) + lowerBound);

// contains 10000 primes lol
const prime = require("./prime.js");

module.exports = {
  getPrime() {
    return prime.getPrime();
  },
  getPrimitiveRoot(P) {
    //greatest common divisor func
    const gcd = (n, m) => {
      if (m == 0) return n;
      return gcd(m, n % m);
    };
    // getting a coprime
    let coPrime = getRandomInt(10, P);
    while (gcd(prime, coPrime) !== 1) {
      coPrime = getRandomInt(10, P);
    }
    // need to check prmp here
    return coPrime;
  },
  generatePartialKey(P, G) {
    const secretInt = getRandomInt(1, P);
    return Math.pow(G, secretInt) % P;
  },
  computeKey(clientPartialKey, P) {
    return clientPartialKey % P;
  }
};
