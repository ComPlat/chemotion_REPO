import React from 'react';
import { Table } from 'react-bootstrap';
import PropTypes from 'prop-types';
import RepoReviewTimeFormat from './RepoReviewTimeFormat';

const RepoReviewHisColumns = (props) => {
  const { comments } = props;

  if (comments && Object.keys(comments).length > 0) {
    return (
      <Table bordered style={{ fontSize: 'small', margin: '0px' }}>
        <thead>
          <tr>
            <th width="10%">Column</th>
            <th width="20%">Information</th>
            <th width="10%">Date</th>
            <th width="50%">Comment</th>
            <th width="10%">From User</th>
          </tr>
        </thead>
        <tbody>
          {
            Object.keys(comments).map((key) => {
              const info = comments[key];
              return (
                <tr key={key}>
                  <td width="10%">{key}</td>
                  <td width="20%">{info.origInfo}</td>
                  <td width="10%">{RepoReviewTimeFormat(info.timestamp)}</td>
                  <td width="50%">{info.comment}</td>
                  <td width="10%">{info.username}</td>
                </tr>
              );
            })
          }
        </tbody>
      </Table>
    );
  }
  return <span />;
};

RepoReviewHisColumns.propTypes = {
  comments: PropTypes.object,
};

RepoReviewHisColumns.defaultProps = {
  comments: {}
};

export default RepoReviewHisColumns;
