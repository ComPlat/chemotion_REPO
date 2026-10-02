import React from 'react';
import PropTypes from 'prop-types';
import { Select } from 'src/components/common/Select';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';

export default class CollectionSelect extends React.Component {
  constructor(props) {
    super(props);

    const { lockedRoots, unsharedRoots } = CollectionStore.getState();
    this.state = {
      lockedRoots: lockedRoots || [],
      unsharedRoots: unsharedRoots || [],
    };

    this.onColChange = this.onColChange.bind(this);
    this.onColSelectChange = this.onColSelectChange.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onColChange);
  }

  onColChange(state) {
    if (
      state.lockedRoots != this.state.lockedRoots
      || state.unsharedRoots != this.state.unsharedRoots
    ) {
      this.setState({
        lockedRoots: state.lockedRoots || [],
        unsharedRoots: state.unsharedRoots || [],
      });
    }
  }

  onColSelectChange({ value }) {
    this.props.onChange(value);
  }

  makeTree(collections, tree = [], depth = 0) {
    if (!Array.isArray(collections)) return tree;

    collections.forEach((collection) => {
      if (collection.label === 'All') return;

      tree.push({ value: collection.id, label: collection.label, depth });
      this.makeTree(collection.children, tree, depth + 1);
    });

    return tree;
  }

  render() {
    const { value } = this.props;
    const { lockedRoots, unsharedRoots } = this.state;
    const roots = [...lockedRoots, ...unsharedRoots];
    const options = this.makeTree(roots);

    const optionLabel = ({ label, depth }) => (
      <span style={{ paddingLeft: `${depth * 10}px` }}>
        {label}
      </span>
    );

    return (
      <Select
        id="modal-collection-id-select"
        options={options}
        formatOptionLabel={optionLabel}
        value={options.find((o) => o.value === value)}
        onChange={this.onColSelectChange}
      />
    );
  }
}

CollectionSelect.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

CollectionSelect.defaultProps = {
  value: null,
};
