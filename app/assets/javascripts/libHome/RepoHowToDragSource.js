import React from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';
import DragDropItemTypes from '../components/DragDropItemTypes';

const listSource = {
  beginDrag(props) { return { sid: props.sid, stelle: props.stelle }; },
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

const RepoHowToDragSource = ({ connectDragSource }) => connectDragSource(<span className="fa fa-lg fa-arrows text-info drag-source" />);

export default DragSource(DragDropItemTypes.HOWTO, listSource, collectSource)(RepoHowToDragSource);

RepoHowToDragSource.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
};
