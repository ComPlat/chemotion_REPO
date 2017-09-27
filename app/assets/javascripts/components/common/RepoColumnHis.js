import React from 'react';
import { Table, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import RepoReviewTimeFormat from './RepoReviewTimeFormat';

const showInfoTip = <Tooltip id="col_showinfo_tooltip">show Information</Tooltip>;
const hideInfoTip = <Tooltip id="col_hideinfo_tooltip">hide Information</Tooltip>;


export default class RepoColumnHis extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showInfo: false
    }
  }


  render() {
    const { history, field } = this.props;
    const { showInfo } = this.state;
    const columnHis = history.filter(h => h.comments && h.comments[`${field}`] && h.comments[`${field}`].comment !== '');
    if (columnHis && columnHis.length > 0) {
      if (showInfo == true) {
        return (
          <Table bordered style={{ fontSize: 'small', margin: '0px' }}>
            <thead>
              <tr>
                <th width="30%">
                  <div className="title" style={{ backgroundColor: 'white' }} onClick={() => this.setState({ showInfo: !showInfo })} >
                    <OverlayTrigger placement="top" overlay={hideInfoTip}>
                      <i className="fa fa-minus-square-o" />
                    </OverlayTrigger>
                    &nbsp;&nbsp; Information
                  </div>
                </th>
                <th width="15%">Date</th>
                <th width="45%">Comment</th>
                <th width="10%">From User</th>
              </tr>
            </thead>
            <tbody>
              {
                columnHis.map((info) => {
                  return (
                    <tr>
                      <td width="30%">{info.comments[`${field}`].origInfo}</td>
                      <td width="15%">{RepoReviewTimeFormat(info.comments[`${field}`].timestamp)}</td>
                      <td width="45%">{info.comments[`${field}`].comment}</td>
                      <td width="10%">{info.comments[`${field}`].username}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </Table>
        );
      } else {
        return (
          <Table bordered style={{ fontSize: 'small', margin: '0px' }}>
            <thead>
              <tr>
                <th width="15%">
                  <div
                    className="title"
                    style={{ backgroundColor: 'white' }}
                    onClick={() => this.setState({ showInfo: !showInfo })}
                  >
                    <OverlayTrigger placement="top" overlay={showInfoTip}>
                      <i className="fa fa-plus-square-o" />
                    </OverlayTrigger>
                    &nbsp;&nbsp; Date
                  </div>
                </th>
                <th width="45%"></th>
                <th width="10%">From User</th>
              </tr>
            </thead>
            <tbody>
              {
                columnHis.map((info) => {
                  return (
                    <tr>
                      <td width="20%">{RepoReviewTimeFormat(info.comments[`${field}`].timestamp)}</td>
                      <td width="60%">{info.comments[`${field}`].comment}</td>
                      <td width="10%">{info.comments[`${field}`].username}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </Table>
        );
      }
    }
    return <span />;
  };
}

RepoColumnHis.propTypes = {
  field: PropTypes.string.isRequired,
  history: PropTypes.array
};

RepoColumnHis.defaultProps = {
  history: []
};
