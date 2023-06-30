const getFormattedRange = (data) => {
  if (!data || data === '-Infinity...Infinity') {
    return '';
  }
  const result = _result => `${_result} °C`;
  const rangeRegex = /^([^.\s]+(?:\.[^.\s]+)?)\.{2,3}([^.\s]+(?:\.[^.\s]+)?)$/;
  if (rangeRegex.test(data)) {
    const [, startValue, endValue] = data.match(rangeRegex);
    if (startValue === endValue || endValue === 'Infinity') {
      return result(startValue);
    } else if (startValue === '-Infinity') {
      return result(endValue);
    }
    return result(`${startValue} - ${endValue}`);
  }
  return result(data);
};

export default getFormattedRange;
