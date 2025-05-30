import React, { useState } from 'react';
import { Button, ButtonGroup, Col, Row } from 'react-bootstrap';
import { GenGridBase } from 'chem-generic-ui-viewer';
import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';
import Utils from 'src/utilities/Functions';
import RepoGenericHubDesc from 'src/repoHome/RepoGenericHubDesc';
import { capitalizeFirstLetter } from 'src/components/chemrepo/format-utils';

const getCurrentDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is zero-based, so we add 1 and pad with leading zero if needed.
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

const downloadFile = (data, filename) => {
  const href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
  Utils.downloadFile({ contents: href, name: `${filename}_${getCurrentDateTimeString()}.json` });
};

const RepoGenericHub = () => {
  const [state, setState] = useState({
    menuSelected: '',
    gridData: [],
  });

  const { menuSelected, gridData } = state;

  const TemplateRenderer = (params) => {
    const {
      node, downloadName
    } = params;
    const onShow = () => {
      node.setSelected(true, true);
      downloadFile(
        node.data.properties_release || {}
        , `${downloadName}_${node.data.label || ''}_${node.data.identifier || ''}`
      );
    };

    return (
      <span>
        <Button onClick={onShow}><i className="fa fa-download" aria-hidden="true" />&nbsp;Download</Button>
      </span>
    );
  };

  const BelongsToRenderer = (params) => {
    const { data } = params;
    return (
      <>
        {data.element_klass?.label}
        &nbsp;
        <i className={data.element_klass?.icon_name} aria-hidden="true" />
      </>
    );
  };

  const IconRenderer = (params) => {
    const { value, iconStyle } = params;
    return <i className={value} aria-hidden="true" style={iconStyle || { color: 'black' }} />;
  };

  const elColumnDefs = [
    {
      field: 'name',
      minWidth: 170,
    },
    { headerName: 'Prefix', width: 80, minWidth: 80, field: 'klass_prefix' },
    { headerName: 'Element label', field: 'label' },
    {
      headerName: 'Icon',
      field: 'icon_name',
      minWidth: 80,
      width: 80,
      sortable: false,
      filter: false,
      cellRenderer: IconRenderer,
    },
    { headerName: 'Description', field: 'desc' },
    { headerName: 'Version', width: 80, minWidth: 80, field: 'version' },
    { headerName: 'Released at', field: 'released_at' },
    { headerName: 'Id', field: 'uuid' },
    {
      headerName: 'Template',
      cellRenderer: TemplateRenderer,
      cellRendererParams: { downloadName: `Generic ${capitalizeFirstLetter(menuSelected)} Template` },
      sortable: false,
      filter: false,
    },
  ];

  const sgColumnDefs = [
    { headerName: 'Segment label', field: 'label' },
    { headerName: 'Description', field: 'desc' },
    {
      headerName: 'Belongs to',
      field: 'element_klass.name',
      minWidth: 80,
      cellRenderer: BelongsToRenderer,
    },
    { headerName: 'Version', width: 80, minWidth: 80, field: 'version' },
    { headerName: 'Released at', field: 'released_at' },
    { headerName: 'Id', field: 'uuid' },
    {
      headerName: 'Template',
      cellRenderer: TemplateRenderer,
      cellRendererParams: { downloadName: `Generic ${capitalizeFirstLetter(menuSelected)} Template` },
      sortable: false,
      filter: false,
    },
  ];

  const dsColumnDefs = [
    {
      hide: true,
      headerName: '#',
      valueFormatter: params => `${parseInt(params.node.id, 10) + 1}`,
      sortable: false,
    },
    {
      headerName: 'Chemical Methods Ontology', field: 'label', minWidth: 350,
    },
    { headerName: 'Version', width: 80, minWidth: 80, field: 'version' },
    { headerName: 'Released at', field: 'released_at' },
    { headerName: 'Id', field: 'uuid' },
    {
      headerName: 'Template',
      cellRenderer: TemplateRenderer,
      cellRendererParams: { downloadName: `Generic ${capitalizeFirstLetter(menuSelected)} Template` },
      sortable: false,
      filter: false,
    },
  ];


  const columnDefs = {
    element: elColumnDefs,
    segment: sgColumnDefs,
    dataset: dsColumnDefs,
  };

  const clickMenu = (e, type) => {
    e.stopPropagation();
    GenericBaseFetcher.open(`list?klass=${capitalizeFirstLetter(type)}Klass&with_props=true`, 'GET')
      .then((result) => {
        setState({ ...state, menuSelected: type, gridData: result?.list || [] });
      })
      .catch((error) => {
        console.error('Error fetching dataset klasses:', error);
        setState({ ...state, menuSelected: type, gridData: [] });
      });
  };

  return (
    <Row className="repo-welcome">
      <Col lg={12} md={12} sm={12}>
        <div className="repo-generic-hub-layout">
          <div className="repo-generic-hub-inner">
            <div className="content">
              <RepoGenericHubDesc />
              <ButtonGroup>
                <Button className="hub-menu" active={menuSelected === 'element'} onClick={e => clickMenu(e, 'element')}>Generic Element Template</Button>
                <Button className="hub-menu" active={menuSelected === 'segment'} onClick={e => clickMenu(e, 'segment')}>Generic Segment Template</Button>
                <Button className="hub-menu" active={menuSelected === 'dataset'} onClick={e => clickMenu(e, 'dataset')}>Generic Dataset Template</Button>
              </ButtonGroup>
              {
                menuSelected && (
                  <div style={{ flex: '1', margin: '0px 15px 15px 15px' }}>
                    <h3>{menuSelected ? `Generic ${capitalizeFirstLetter(menuSelected)} Template` : ''}</h3>
                    <div>
                      <GenGridBase columnDefs={columnDefs[menuSelected]} rowData={gridData} />
                    </div>
                  </div>
                )
              }
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
};

export default RepoGenericHub;
