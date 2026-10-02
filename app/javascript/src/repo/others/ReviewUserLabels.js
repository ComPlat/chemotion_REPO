/* eslint-disable react/destructuring-assignment */
/* eslint-disable max-classes-per-file */
import React from 'react';
import PropTypes from 'prop-types';
import { Badge, Form } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import UserStore from 'src/stores/alt/stores/UserStore';

class ReviewUserLabels extends React.Component {
  constructor(props) {
    super(props);
    const userState = UserStore.getState();
    const currentUser = (userState && userState.currentUser) || {};
    const labels = this.props.labels || (userState && userState.labels) || [];
    const curLabelIds = this.props.element.user_labels || [];

    // Initialize selectedLabels with proper format (value/label objects)
    const initialSelectedLabels = (labels || [])
      .filter(
        (r) => (curLabelIds || []).includes(r.id)
          && (r.access_level > 0 || r.user_id === currentUser.id)
      )
      .map((ll) => ({
        value: ll.id,
        label: (
          <Badge
            bg="null"
            style={{
              backgroundColor: ll.color,
              borderRadius: ll.access_level === 2 ? '0.25em' : '10px',
            }}
          >
            {ll.title}
          </Badge>
        ),
      }));

    this.state = {
      currentUser,
      labels,
      selectedLabels: initialSelectedLabels,
    };
    this.onChange = this.onChange.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  handleSelectChange(val) {
    const { element } = this.props;
    if (val) {
      const ids = val.map(v => v.value);
      if (ids != null) {
        this.props.fnCb(element, ids);
      }
      this.setState({ selectedLabels: val });
    }
  }

  onChange(state) {
    const { currentUser, labels } = state;
    this.setState({
      currentUser,
      labels
    });
  }

  render() {
    const { selectedLabels, currentUser, labels } = this.state;
    const reviewLabel = labels;

    const labelOptions =
      (reviewLabel || [])
        .filter(r => r.access_level > 0 || r.user_id === currentUser.id)
        .map(ll => ({
          value: ll.id,
          label: (
            <Badge
              bg="null"
              style={{
                backgroundColor: ll.color,
                borderRadius: ll.access_level === 2 ? '0.25em' : '10px',
              }}
            >
              {ll.title}
            </Badge>
          ),
       })) || [];

    return (
      <div>
        <Form.Group>
          <Select
            className="status-select"
            name="sampleUserLabels"
            clearable={false}
            isMulti
            options={labelOptions}
            value={selectedLabels}
            onChange={(e) => this.handleSelectChange(e)}
            styles={{
              menuPortal: base => ({
                ...base,
                zIndex: 1000,
                position: 'fixed',
              }),
              menu: base => ({
                ...base,
                zIndex: 1000,
              }),
            }}
          />
        </Form.Group>
      </div>
    );
  }
}


ReviewUserLabels.propTypes = {
  element: PropTypes.object.isRequired,
  fnCb: PropTypes.func.isRequired,
};

export {
  ReviewUserLabels,
};
