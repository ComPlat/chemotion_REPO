/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';

const DateInfo = (props) => {
  const {
    isPublished, preText, pubData, tagData
  } = props;

  const getTimeString = date => (date ? `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}` : '');
  const getFormattedTime = date => (date ? `${getTimeString(date)} ${date.getHours()}:${date.getMinutes()}` : '');

  const publishedTime = tagData?.published_at || tagData?.doi_reg_at;
  const publishedDate = new Date(publishedTime);
  const formattedPublishedDate = getTimeString(publishedDate);

  const submittedDate = new Date(pubData?.created_at);
  const formattedSubmittedDate = getTimeString(submittedDate);

  const updatedDate = new Date(pubData?.updated_at);
  const formattedUpdatedDate = getFormattedTime(updatedDate);

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
