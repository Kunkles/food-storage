// Display formatting helpers.
export const fmtMoney = (n) => `$${(Number(n) || 0).toFixed(2)}`
export const fmtMoneyRound = (n) => `$${Math.round(Number(n) || 0)}`
export const fmtKcal = (n) => `${Math.round(Number(n) || 0).toLocaleString()} kcal`
export const fmtGallons = (n) => `${(Number(n) || 0).toFixed(1)} gal`
export const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString()
