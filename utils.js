export const debounce = (func, wait) => {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

export const normalizeAddress = (addr) => addr.trim().toUpperCase();

export const calculateCFM = (btu) => {
  if (!btu || isNaN(btu)) return { max: null, min: null };
  const max = (btu / 12000) * 400;
  const min = max * 0.85;
  return { max: Math.round(max), min: Math.round(min) };
};
