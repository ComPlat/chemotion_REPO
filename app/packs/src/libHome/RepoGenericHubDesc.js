import React from 'react';
import { Button } from 'react-bootstrap';
import { GenGridBase } from 'chem-generic-ui';
import ContactEmail from '../components/chemrepo/core/ContactEmail';

const gridData = [
  {
    desc: '1H nuclear magnetic resonance spectroscopy (1H NMR)',
    label: '1H nuclear magnetic resonance spectroscopy (1H NMR)',
    released_at: '2021-08-06T21:25:08.057Z',
    properties_release: { }
  },
  {
    desc: 'cyclic voltammetry (CV)',
    label: 'cyclic voltammetry (CV)',
    released_at: '2021-08-08T20:26:08.088Z',
    properties_release: { }
  }
];

const RepoGenericHubDesc = () => {
  const TemplateRenderer = () => (
    <span>
      <Button style={{ cursor: 'auto' }}><i className="fa fa-download" aria-hidden="true" />&nbsp;Download</Button>
    </span>
  );

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
    { headerName: 'Released at', field: 'released_at' },
    {
      headerName: 'Template',
      cellRenderer: TemplateRenderer,
      sortable: false,
      filter: false,
    },
  ];

  return (
    <div className="repo-generic-hub-desc">
      <h1>LabIMotion Template Hub<span className="contact"><ContactEmail email="chemotion-labimotion@lists.kit.edu" label="Send feedback about LabIMotion" /></span></h1>
      <h3>
        Welcome to the <b>LabIMotion Template Hub</b>, a platform for sharing new elements, segments, and datasets templates.
      </h3>
      <h3>Getting Started</h3>
      <h5>
        To begin exploring the templates, simply click on the <span className="start"><i className="fa fa-caret-left" aria-hidden="true" /></span> on the left-hand side.
      </h5>
      <h3>Quick Look User Interface</h3>
      <h5>
        <p>The templates are displayed in a grid layout. You can </p>
        <p><i className="fa fa-check" aria-hidden="true" />&nbsp;sort the grid by clicking on the column headers. </p>
        <p><i className="fa fa-check" aria-hidden="true" />&nbsp;filter the grid by clicking on the filter icon <i className="fa fa-bars" aria-hidden="true" /> located at the right of the column headers. </p>
        <p><i className="fa fa-check" aria-hidden="true" />&nbsp;download a specific template by clicking on the button <span className="download"><i className="fa fa-download" aria-hidden="true" />&nbsp;Download</span>. </p>
      </h5>
      <div style={{ height: '200px' }}>
        <GenGridBase gridColumn={dsColumnDefs} gridData={gridData} />
      </div>
    </div>
  );
};

export default RepoGenericHubDesc;
