/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { getFormattedISODate, getFormattedISODateTime } from 'src/components/chemrepo/date-utils';

const DateInfo = (props) => {
  const {
    isPublished, preText, pubData, tagData
  } = props;

  const formattedPublishedDate =
  getFormattedISODate((tagData?.published_at || tagData?.doi_reg_at));
  const formattedSubmittedDate = getFormattedISODate(pubData?.created_at);
  const formattedUpdatedDate = getFormattedISODateTime(pubData?.updated_at);

  if (isPublished) {
    return (<span><b>{preText} Published on </b> <i>{formattedPublishedDate}</i></span>);
  }
  return (<div className="date_info"><div><b>{preText} Submitted on </b> <i>{formattedSubmittedDate}</i></div><div className="updated">Updated on {formattedUpdatedDate}</div></div>);
};

DateInfo.propTypes = {
  isPublished: PropTypes.bool.isRequired,
  preText: PropTypes.string.isRequired,
  pubData: PropTypes.object.isRequired,
  tagData: PropTypes.object.isRequired,
};

export default DateInfo;
