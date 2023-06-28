const getFormattedRange = (data) => {
  if (!data || data === '-Infinity...Infinity') {
    return '';
  }
  const rangeRegex = /^([^.\s]+(?:\.[^.\s]+)?)\.{2,3}([^.\s]+(?:\.[^.\s]+)?)$/;
  if (rangeRegex.test(data)) {
    const [, startValue, endValue] = data.match(rangeRegex);
    if (startValue === endValue || endValue === 'Infinity') {
      return startValue;
    } else if (startValue === '-Infinity') {
      return endValue;
    }
    return `${startValue} - ${endValue}`;
  }
  return data;
};

export default getFormattedRange;
