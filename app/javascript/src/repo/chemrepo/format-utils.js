const capitalizeFirstLetter = str =>
  str.replace(/^[a-z]/, match => match.toUpperCase());
const formatPercentage = (value, precision = 3, defaultValue = ' - ') => {
  if (value == null) return defaultValue;

  const numValue = Number(value);
  if (Number.isNaN(numValue)) return defaultValue;

  if (Number.isInteger(numValue)) {
    return `${numValue}%`;
  }

  if (numValue >= 0.001) {
    return `${Number(numValue.toFixed(precision))}%`;
  }
  return `${Number(numValue.toPrecision(precision))}%`;
};
export { capitalizeFirstLetter, formatPercentage };
