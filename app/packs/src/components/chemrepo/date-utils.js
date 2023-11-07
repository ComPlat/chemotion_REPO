import moment from 'moment';

export const formatDateDMYTime = (params) => {
  const dateTime = new Date(params);
  const options = {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  };
  return dateTime.toLocaleDateString('en-GB', options);
};

export const formatDateYMDLong = (dt) => {
  if (dt == null || typeof dt === 'undefined') return '';
  try {
    const m = moment(dt, 'DD/MM/YYYY HH:mm:ss');
    if (m.isValid()) {
      return dt;
    }
    const dtJSON = new Date(dt).toJSON();
    const dtISO = new Date(Date.parse(dt)).toISOString();
    if (dtISO === dtJSON) {
      return moment.parseZone(new Date(Date.parse(dt))).utc().format('DD/MM/YYYY HH:mm:ss').toString();
    }
    return '';
  } catch (e) {
    return '';
  }
};

export const getFormattedTime = date => (date ? moment(date).format('HH:mm') : '');
export const getFormattedISODateTime = date => (date ? moment(date).format('YYYY-MM-DD HH:mm') : '');
export const getFormattedISODate = (date) => {
  if (date == null || typeof date === 'undefined') return '';
  try {
    const m = moment(date, 'YYYY-MM-DD');
    if (m.isValid()) {
      return m.format('YYYY-MM-DD');
    }
    return '';
  } catch (e) {
    return '';
  }
};
