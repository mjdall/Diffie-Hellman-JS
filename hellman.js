getRandomInt = (lowerBound, upperBound) =>
  Math.round(Math.random() * (upperBound - lowerBound) + lowerBound);

// contains 10000 primes lol
const prime = require("./prime.js");

function primitiveRoot(P) {
  let fact = [];
  let phi = P - 1,
    n = phi;
  for (let i = 2; i * i <= n; i++) {
    if (n % i == 0) {
      // this might be wrong
      fact.push(i);
      while (n % i == 0) n /= i;
    }
  }
  if (n > 1) fact.push(n);

  for (let res = 2; res <= P; ++res) {
    let ok = true;
    for (let i = 0; i < fact.length && ok; ++i) {
      ok &= Math.pow(res, phi / fact[i], P) != 1;
      if (ok) return res;
    }
  }
  return -1;
}

module.exports = {
  getPrime() {
    return prime.getPrime();
  },
  getPrimitiveRoot(P) {
    console.log(primitiveRoot(P));
    return primitiveRoot(P);
  },
  generatePartialKey(P, G) {
    const secretInt = getRandomInt(1, P);
    return Math.pow(G, secretInt) % P;
  },
  computeKey(clientPartialKey, P) {
    return clientPartialKey % P;
  }
};
