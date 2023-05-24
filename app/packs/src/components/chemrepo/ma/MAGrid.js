/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';

const MAGrid = (props) => {
  const { xvialCompounds, data, fnSelect } = props;
  const [rowData] = useState(xvialCompounds.data || []);

  const columnDefs = [
    { headerName: 'X-Vial', field: 'x_data.xid' },
    { headerName: 'Provided by', field: 'x_data.provided_by' },
    {
      headerName: 'Group',
      field: 'x_data.group',
      valueGetter: 'data.x_data.group || "Stefan Bräse Group"',
    },
    { headerName: 'Short label of Sample', field: 'x_short_label' },
    { headerName: 'Created at', field: 'x_created_at' },
  ];

  const getRowStyle = (params) => {
    if (params.data.x_data.xid === data && data !== '') {
      return { background: '#d1e7dd', color: '#0f5132' };
    }
    return null;
  };

  const handleRowSelection = (event) => {
    const selectedRows = event.api.getSelectedRows();
    if (selectedRows.length > 0) {
      const selectedRow = selectedRows[0];
      fnSelect(selectedRow.x_data.xid);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div
        style={{ width: '100%', height: '100%' }}
        className="ag-theme-balham"
      >
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={{
            suppressMovable: true,
            resizable: true,
            sortable: true,
          }}
          domLayout="autoHeight"
          getRowStyle={getRowStyle}
          onSelectionChanged={handleRowSelection}
          rowSelection="single"
          rowData={rowData}
        />
      </div>
    </div>
  );
};

MAGrid.propTypes = {
  xvialCompounds: PropTypes.object.isRequired,
  data: PropTypes.string.isRequired,
  fnSelect: PropTypes.func.isRequired,
};

export default MAGrid;
