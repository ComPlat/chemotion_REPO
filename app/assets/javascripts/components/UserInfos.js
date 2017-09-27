import React from 'react';
import PropTypes from 'prop-types';
import {Tooltip} from 'react-bootstrap';
import UserInfoIcon from './UserInfoIcon';

const UserInfos = ({users}) => {
  let tipUsers = users.map((user,ind)=>{
    if (typeof (user.user) !== 'undefined' && user.user) {
      return <div key={ind}><UserInfoIcon type={user.user.type}/> {user.user.name}<br/></div>
    } else {
      return <div key={ind}><UserInfoIcon type={user.type}/> {user.name}<br/></div>
    }
  })
  return(
    <Tooltip id="tooltip">
      {tipUsers.map(u=>u)}
    </Tooltip>
  )
}

UserInfos.propTypes = {
  users: PropTypes.array.isRequired,
}

export default UserInfos;
