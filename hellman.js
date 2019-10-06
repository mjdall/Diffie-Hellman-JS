getRandomInt = (lowerBound, upperBound) =>
  Math.round(Math.random() * (upperBound - lowerBound) + lowerBound);

// contains 10000 primes lol
const prime = require("./prime.js");

const gcd = (a, b) => {
  if (b == 0) return a;
  return gcd(b, a % b);
};

const getNumPrimRoots = p => {
  let result = 1;
  for (let i = 1; i < p; i += 2) {
    if (gcd(i, p) == 1) {
      result += 1;
    }
  }
  return result;
};

// found here: https://rosettacode.org/wiki/Miller%E2%80%93Rabin_primality_test#JavaScript
function probablyPrime(n, k) {
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0 || n < 2) return false;

  // Write (n - 1) as 2^s * d
  let s = 0,
    d = n - 1;
  while (d % 2 === 0) {
    d /= 2;
    ++s;
  }

  WitnessLoop: do {
    // A base between 2 and n - 2
    let x = Math.pow(2 + Math.floor(Math.random() * (n - 3)), d) % n;

    if (x === 1 || x === n - 1) continue;

    for (let i = s - 1; i--; ) {
      x = (x * x) % n;
      if (x === 1) return false;
      if (x === n - 1) continue WitnessLoop;
    }

    return false;
  } while (--k);

  return true;
}

const pow = (x, y, p) => {
  let result = 1;
  x = x % p;

  while (y > 0) {
    if (y & 1) result = (result * x) % p;
    y = y >> 1;
    x = (x * x) % p;
  }
  return result;
};

const findPrimeFactors = p => {
  let s = new Set();
  while (p % 2 === 0) {
    s.add(2);
    p = Math.floor(p / 2);
  }

  for (let i = 3; i < Math.floor(Math.sqrt(p)); i += 2) {
    while (p % i === 0) {
      s.add(i);
      p = Math.floor(p / i);
    }
  }

  if (p > 2) s.add(p);

  return s;
};

module.exports = {
  getPrime() {
    return prime.getPrime();
  },
  getPrimitiveRoot(p) {
    // found the base code here: https://www.geeksforgeeks.org/primitive-root-of-a-prime-number-n-modulo-n/
    // not a prime
    if (probablyPrime(p)) return -1;

    const numPrimRoots = getNumPrimRoots(p);
    const getRootNum = getRandomInt(1, numPrimRoots);
    const phi = p - 1;
    const s = findPrimeFactors(phi);
    let rootsFound = 0;

    for (let i = 2; i < phi + 1; i++) {
      let flag = false;
      // for each prime factor
      for (let it in s) {
        if (pow(i, Math.floor(phi / it), p) === 1) {
          flag = true;
          break;
        }
      }
      // no power with value 1, this is a pr
      if (flag === false) rootsFound += 1;

      // we've found the root we're looking for
      if (rootsFound === getRootNum) return i;
    }
    return -1;
  },
  getSecretInt(P) {
    return getRandomInt(1, P);
  },
  generatePartialKey(P, G, N) {
    return pow(G, N, P);
  },
  computeKey(clientPartialKey, P) {
    return clientPartialKey % P;
  }
};
