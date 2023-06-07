import PropTypes from 'prop-types';
import React from 'react';
import { AgGridReact } from 'ag-grid-react';

export default class ArchivedManagement extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.activedColumnDefs = [
      {
        headerName: 'Actived File',
        field: 'fileName',
        width: 250,
      },
      {
        headerName: 'Created At',
        width: 125,
        suppressSizeToFit: true,
        sortable: true,
        field: 'createdAt'
      },
    ];
    this.archivedColumnDefs = [
      {
        headerName: 'Archived File',
        field: 'fileName',
        width: 250,
      },
      {
        headerName: 'Created At',
        width: 125,
        suppressSizeToFit: true,
        sortable: true,
        field: 'createdAt'
      },
    ];

    this.onActivedGridReady = this.onActivedGridReady.bind(this);
    this.onArchivedGridReady = this.onArchivedGridReady.bind(this);

    this.setArchived = this.setArchived.bind(this);
    this.setActived = this.setActived.bind(this);
  }

  componentDidUpdate() {
    if (this.activedGridApi && this.activedGridColumnApi) {
      this.activedGridColumnApi.autoSizeColumns();
    }

    if (this.archivedGridApi && this.archivedGridColumnApi) {
      this.archivedGridColumnApi.autoSizeColumns();
    }
  }

  onActivedGridReady(params) {
    this.activedGridApi = params.api;
    this.activedGridColumnApi = params.columnApi;

    params.api.sizeColumnsToFit();
  }

  onArchivedGridReady(params) {
    this.archivedGridApi = params.api;
    this.archivedGridColumnApi = params.columnApi;

    params.api.sizeColumnsToFit();
  }

  setArchived() {
    if (!this.activedGridApi) return;

    const fileIds = this.activedGridApi.getSelectedRows().map(s => s.id);
    this.props.setArchivedValue(fileIds, true);
  }

  setActived() {
    if (!this.archivedGridApi) return;

    const fileIds = this.archivedGridApi.getSelectedRows().map(s => s.id);
    this.props.setArchivedValue(fileIds, false);
  }

  render() {
    const { archivedFiles, activedFiles } = this.props;
    const gridStyle = {
      height: 'calc(100vh - 100px)', flex: 1
    };
    const buttonStyle = {
      width: '33px',
      margin: '5px',
      textAlign: 'center',
      alignSelf: 'center',
      color: 'rgba(0, 0, 0, 0.54)'
    };

    return (
      <div style={{ display: 'flex', margin: '10px' }}>
        <div className="ag-theme-balham" style={gridStyle}>
          <AgGridReact
            id="activedFilesGrid"
            columnDefs={this.activedColumnDefs}
            rowData={activedFiles}
            pagination
            paginationAutoPageSize
            paginateChildRows
            rowSelection="multiple"
            onGridReady={this.onActivedGridReady}
          />
        </div>
        <div style={buttonStyle}>
          <button className="btn btn-xs" onClick={this.setArchived}>
            <i className="fa fa-arrow-circle-right fa-2x" />
          </button>
          &nbsp; &nbsp;
          <button className="btn btn-xs" onClick={this.setActived}>
            <i className="fa fa-arrow-circle-left fa-2x" />
          </button>
        </div>
        <div className="ag-theme-balham" style={gridStyle}>
          <AgGridReact
            id="archivedFilesGrid"
            columnDefs={this.archivedColumnDefs}
            rowData={archivedFiles}
            pagination
            paginationAutoPageSize
            paginateChildRows
            rowSelection="multiple"
            onGridReady={this.onArchivedGridReady}
          />
        </div>
      </div>
    );
  }
}

ArchivedManagement.propTypes = {
  archivedFiles: PropTypes.arrayOf(PropTypes.object).isRequired,
  activedFiles: PropTypes.arrayOf(PropTypes.object).isRequired,
  setArchivedValue: PropTypes.func.isRequired,
};
