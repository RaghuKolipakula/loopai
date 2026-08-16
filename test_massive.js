const apiKey = "1c8wkfZf5H7W6ki4ExuZcB3uWZtmFdrt";
// Try polygon.io first as the massive.com domain might not actually exist in the real world
fetch(`https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=SPY&limit=1&apiKey=${apiKey}`)
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
