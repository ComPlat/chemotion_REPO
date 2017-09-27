import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from '../components/DragDropItemTypes';

const stelleTarget = {
  drop(targetProps, monitor) {
    const targetTag = { sid: targetProps.sid, stelle: targetProps.stelle };
    const sourceProps = monitor.getItem();
    const sourceTag = { sid: sourceProps.sid, stelle: sourceProps.stelle };
    if (targetTag.sid !== sourceTag.sid) {
      targetProps.onDrop({ sourceTag, targetTag });
    }
  }
};

const stelleDropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});


class RepoHowToDropTarget extends Component {
  render() {
    const { connectDropTarget, isOver, canDrop } = this.props;
    const className = `editor-field-drop-target${isOver ? ' is-over' : ''}${canDrop ? ' can-drop' : ''}`;
    return connectDropTarget(<div className={className}><div className="indicator" /></div>);
  }
}

export default DropTarget(
  DragDropItemTypes.HOWTO,
  stelleTarget, stelleDropCollect
)(RepoHowToDropTarget);

RepoHowToDropTarget.propTypes = {
  connectDropTarget: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};
