/*function simulatePrice(price) {
  let delta = price * (Math.random() * 0.04 - 0.02); // ±2%
  return Math.round((price + delta) * 100) / 100;
}

module.exports = { simulatePrice };
*/
// server/utils/simulate.js
function simulatePrice(basePrice) {
  // Simulate a realistic price fluctuation: ±5%
  basePrice = parseFloat(basePrice);
  const fluctuation = (Math.random() * 0.1 - 0.05) * basePrice;
  return parseFloat((basePrice + fluctuation).toFixed(2));
}

module.exports = {
  simulatePrice
};
