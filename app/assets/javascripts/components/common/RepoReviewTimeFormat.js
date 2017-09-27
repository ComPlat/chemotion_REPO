import moment from 'moment';
import PropTypes from 'prop-types';

const RepoReviewTimeFormat = (timeField) => {
  if (timeField == null || typeof timeField === 'undefined' || timeField === '') {
    return '';
  }
  let newTimeObj = null;
  if (moment(timeField, 'DD-MM-YYYY HH:mm:ss').isValid()) {
    newTimeObj = moment(timeField, 'DD-MM-YYYY HH:mm:ss');
    return moment(newTimeObj).format('DD-MM-YYYY HH:mm');
  }
  return timeField;
};

RepoReviewTimeFormat.propTypes = {
  timeField: PropTypes.func.isRequired
};

RepoReviewTimeFormat.defaultProps = {
  timeField: null
};

export default RepoReviewTimeFormat;
