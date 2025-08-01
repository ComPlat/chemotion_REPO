import React, { useEffect, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Col, Row } from 'react-bootstrap';
import { GenGridBase } from 'chem-generic-ui-viewer';
import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';
import Utils from 'src/utilities/Functions';
import RepoGenericHubDesc from 'src/repoHome/RepoGenericHubDesc';
import { capitalizeFirstLetter } from 'src/components/chemrepo/format-utils';
import RepoGenericTemplateModal from 'src/repoHome/RepoGenericTemplateModal';
import ContactEmail from 'src/components/chemrepo/core/ContactEmail';

// Reusable styles
const styles = {
  menuContainer: collapsed => ({
    padding: collapsed ? '10px 5px' : '10px',
    borderRadius: '5px',
    marginBottom: '15px',
    minHeight: '400px',
    transition: 'all 0.3s ease',
  }),
  menuToggle: {
    background: 'none',
    border: 'none',
    color: '#333',
    fontSize: '16px',
  },
  menuButton: {
    width: '100%',
  },
  collapsedButton: {
    width: '40px',
    height: '40px',
    padding: '8px',
  },
  headerContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridContainer: {
    width: '100%',
  },
  welcomeContainer: {
    textAlign: 'center',
    padding: '50px',
    color: '#666',
  },
  menuButtonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  collapsedButtonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    alignItems: 'center',
  },
};

// Menu configuration
const MENU_ITEMS = [
  {
    id: 'templates',
    label: 'LabIMotion Template Hub',
    icon: 'fa-home',
    title: 'Welcome to the LabIMotion Template Hub',
  },
  {
    id: 'element',
    label: 'Generic Element Templates',
    icon: 'fa-cube',
    title: 'Generic Element Templates',
  },
  {
    id: 'segment',
    label: 'Generic Segment Templates',
    icon: 'fa-puzzle-piece',
    title: 'Generic Segment Templates',
  },
  {
    id: 'dataset',
    label: 'Generic Dataset Templates',
    icon: 'fa-database',
    title: 'Generic Dataset Templates',
  },
];

const getCurrentDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

const downloadFile = (data, filename) => {
  const href = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data)
  )}`;
  Utils.downloadFile({
    contents: href,
    name: `${filename}_${getCurrentDateTimeString()}.json`,
  });
};

// Helper to copy text to clipboard with visual feedback
const copyToClipboardWithFeedback = (text, event, successMessage = 'Copied!') => {
  event.stopPropagation();
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const originalTitle = event.currentTarget.title;
      event.currentTarget.title = successMessage;
      setTimeout(() => {
        event.currentTarget.title = originalTitle;
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
};

// Helper to find record by ID
const findRecordById = (data, id) => {
  return data.find(
    item =>
      (item.identifier && item.identifier === id) ||
      (item.uuid && item.uuid.toString() === id)
  );
};

// Helper to get record ID
const getRecordId = nodeData => nodeData.identifier || nodeData.uuid;

const TemplateRenderer = params => {
  const { node, downloadName } = params;
  const onShow = () => {
    node.setSelected(true, true);
    downloadFile(
      node.data.properties_release || {},
      `${downloadName}_${node.data.label || ''}_${node.data.identifier || ''}`
    );
  };

  return (
    <span>
      <RepoGenericTemplateModal element={node.data} name={node.data.label} />
      &nbsp;
      <Button onClick={onShow} title="Download Template" bsSize="small">
        <i className="fa fa-download" aria-hidden="true" />
      </Button>
    </span>
  );
};

const LinkRenderer = params => {
  const { node, menuSelected } = params;
  const recordId = getRecordId(node.data);
  const shareableLink = `${window.location.origin}${window.location.pathname}?type=${menuSelected}&id=${recordId}`;

  return (
    <Button
      onClick={e => copyToClipboardWithFeedback(shareableLink, e, 'Copied!')}
      title="Copy direct link"
      bsSize="small"
    >
      <i className="fa fa-link" aria-hidden="true" />
    </Button>
  );
};

const DownloadLinkRenderer = params => {
  const { node, menuSelected } = params;
  const recordId = getRecordId(node.data);
  const downloadLink = `${window.location.origin}${window.location.pathname}?type=${menuSelected}&id=${recordId}&download=true`;

  return (
    <Button
      onClick={e => copyToClipboardWithFeedback(downloadLink, e, 'Download link copied!')}
      title="Copy download link"
      bsSize="small"
    >
      <i className="fa fa-download" aria-hidden="true" />
      <i className="fa fa-link" aria-hidden="true" style={{ marginLeft: '2px' }} />
    </Button>
  );
};

const BelongsToRenderer = params => {
  const { data } = params;
  return (
    <>
      {data.element_klass?.label}
      &nbsp;
      <i className={data.element_klass?.icon_name} aria-hidden="true" />
    </>
  );
};

const IconRenderer = params => {
  const { value, iconStyle } = params;
  return (
    <i
      className={value}
      aria-hidden="true"
      style={iconStyle || { color: 'black' }}
    />
  );
};

// Common column configurations
const COMMON_COLUMNS = {
  version: { headerName: 'Version', width: 80, minWidth: 80, field: 'version' },
  releasedAt: { headerName: 'Released at', field: 'released_at' },
  uuid: { headerName: 'Id', field: 'uuid', hide: true },
  identifier: { headerName: 'Identifier', field: 'identifier', hide: true },
  link: menuSelected => ({
    headerName: 'Link',
    width: 80,
    minWidth: 80,
    cellRenderer: LinkRenderer,
    cellRendererParams: { menuSelected },
    sortable: false,
    filter: false,
  }),
  downloadLink: menuSelected => ({
    headerName: 'DL Link',
    width: 80,
    minWidth: 80,
    cellRenderer: DownloadLinkRenderer,
    cellRendererParams: { menuSelected },
    sortable: false,
    filter: false,
  }),
  template: menuSelected => ({
    headerName: 'Template',
    cellRenderer: TemplateRenderer,
    cellRendererParams: {
      downloadName: `Generic ${capitalizeFirstLetter(menuSelected)} Template`,
    },
    sortable: false,
    filter: false,
  }),
};

// Create column definitions
const createColumnDefs = menuSelected => ({
  element: [
    { field: 'name', minWidth: 170 },
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
    COMMON_COLUMNS.version,
    COMMON_COLUMNS.releasedAt,
    COMMON_COLUMNS.uuid,
    COMMON_COLUMNS.identifier,
    // COMMON_COLUMNS.link(menuSelected),
    // COMMON_COLUMNS.downloadLink(menuSelected),
    COMMON_COLUMNS.template(menuSelected),
  ],
  segment: [
    { headerName: 'Segment label', field: 'label' },
    { headerName: 'Description', field: 'desc' },
    {
      headerName: 'Belongs to',
      field: 'element_klass.name',
      minWidth: 80,
      cellRenderer: BelongsToRenderer,
    },
    COMMON_COLUMNS.version,
    COMMON_COLUMNS.releasedAt,
    COMMON_COLUMNS.uuid,
    COMMON_COLUMNS.identifier,
    // COMMON_COLUMNS.link(menuSelected),
    // COMMON_COLUMNS.downloadLink(menuSelected),
    COMMON_COLUMNS.template(menuSelected),
  ],
  dataset: [
    {
      hide: true,
      headerName: '#',
      valueFormatter: params => `${parseInt(params.node.id, 10) + 1}`,
      sortable: false,
    },
    {
      headerName: 'Chemical Methods Ontology',
      field: 'label',
      minWidth: 350,
    },
    COMMON_COLUMNS.version,
    COMMON_COLUMNS.releasedAt,
    COMMON_COLUMNS.uuid,
    COMMON_COLUMNS.identifier,
    // COMMON_COLUMNS.link(menuSelected),
    // COMMON_COLUMNS.downloadLink(menuSelected),
    COMMON_COLUMNS.template(menuSelected),
  ],
});

// Reusable Menu Button Component
const MenuButton = ({ item, isSelected, isCollapsed, onClick }) => {
  if (isCollapsed) {
    return (
      <Button
        bsStyle={isSelected ? 'primary' : 'default'}
        style={styles.collapsedButton}
        onClick={e => onClick(e, item.id)}
        title={item.title}
      >
        <i className={`fa ${item.icon}`} aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button
      bsStyle={isSelected ? 'primary' : 'default'}
      className="text-left"
      style={styles.menuButton}
      onClick={e => onClick(e, item.id)}
      title={item.title}
    >
      <i className={`fa ${item.icon}`} aria-hidden="true" />
      &nbsp;{item.label}
    </Button>
  );
};

MenuButton.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

// Header component for grid views
const GridHeader = ({ menuSelected }) => (
  <div style={styles.headerContainer}>
    <h3 style={{ marginBottom: '20px' }}>
      {`Generic ${capitalizeFirstLetter(menuSelected)} Templates`}
    </h3>
    <div style={{ position: 'relative' }}>
      <span className="contact" style={{ marginLeft: '10px' }}>
        <ContactEmail
          email="chemotion-labimotion@lists.kit.edu"
          label="Send feedback about LabIMotion"
        />
      </span>
      <span className="contact">
        <Button
          bsSize="small"
          onClick={() => {
            window.open('https://www.chemotion.net/docs/labimotion', '_blank');
          }}
        >
          <i className="fa fa-book" aria-hidden="true" />
          &nbsp;LabIMotion Docs
        </Button>
      </span>
    </div>
  </div>
);

GridHeader.propTypes = {
  menuSelected: PropTypes.string.isRequired,
};

const RepoGenericHub = () => {
  const [state, setState] = useState({
    menuSelected: 'templates',
    gridData: [],
    menuCollapsed: false,
  });

  const { menuSelected, gridData, menuCollapsed } = state;

  // Helper function to update browser URL
  const updateBrowserUrl = useCallback((type, id = null) => {
    if (type === 'templates') {
      window.history.pushState({}, '', window.location.pathname);
    } else {
      const newUrl = id
        ? `${window.location.pathname}?type=${type}&id=${id}`
        : `${window.location.pathname}?type=${type}`;
      window.history.pushState({}, '', newUrl);
    }
  }, []);

  // Helper function to highlight a row in the grid
  const highlightRow = useCallback((data, targetId) => {
    if (!targetId || !data.length) return;

    setTimeout(() => {
      const targetIndex = data.findIndex(item => {
        const itemId = getRecordId(item);
        return itemId === targetId || itemId?.toString() === targetId;
      });

      if (targetIndex !== -1) {
        const rows = document.querySelectorAll('.ag-row');
        if (rows[targetIndex]) {
          rows[targetIndex].style.backgroundColor = '#e3f2fd';
          rows[targetIndex].style.fontWeight = 'bold';
          rows[targetIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    }, 300);
  }, []);

  // Helper function to download template by ID
  const downloadTemplateById = useCallback((type, id) => {
    GenericBaseFetcher.open(
      `list?klass=${capitalizeFirstLetter(type)}Klass&with_props=true`,
      'GET'
    )
      .then(result => {
        const data = result?.list || [];
        const targetRecord = findRecordById(data, id);

        if (targetRecord) {
          const filename = `Generic_${capitalizeFirstLetter(type)}_Template_${targetRecord.label || ''}_${id}`;
          downloadFile(targetRecord.properties_release || {}, filename);
        }
      })
      .catch(error => {
        console.error('Error downloading template:', error);
      });
  }, []);

  // Shared function to fetch data by type
  const fetchDataByType = useCallback(
    (type, highlightId = null) => {
      if (type === 'templates') {
        setState(prevState => ({
          ...prevState,
          menuSelected: type,
          gridData: [],
        }));
        updateBrowserUrl(type);
        return;
      }

      GenericBaseFetcher.open(
        `list?klass=${capitalizeFirstLetter(type)}Klass&with_props=true`,
        'GET'
      )
        .then(result => {
          const data = result?.list || [];
          setState(prevState => ({
            ...prevState,
            menuSelected: type,
            gridData: data,
          }));

          updateBrowserUrl(type, highlightId);

          if (highlightId) {
            highlightRow(data, highlightId);
          }
        })
        .catch(error => {
          console.error(`Error fetching ${type} data:`, error);
          setState(prevState => ({
            ...prevState,
            menuSelected: type,
            gridData: [],
          }));
        });
    },
    [updateBrowserUrl, highlightRow]
  );

  // Handle URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const id = urlParams.get('id');
    const shouldDownload = urlParams.get('download') === 'true';

    if (type && ['element', 'segment', 'dataset'].includes(type)) {
      fetchDataByType(type, id);

      // If download parameter is present, trigger download after data is loaded
      if (shouldDownload && id) {
        setTimeout(() => downloadTemplateById(type, id), 500);
      }
    }
  }, [fetchDataByType, downloadTemplateById]);

  const toggleMenu = useCallback(e => {
    e.stopPropagation();
    setState(prevState => ({
      ...prevState,
      menuCollapsed: !prevState.menuCollapsed,
    }));
  }, []);

  const clickMenu = useCallback(
    (e, type) => {
      e.stopPropagation();
      fetchDataByType(type);
    },
    [fetchDataByType]
  );

  // Memoize column definitions to prevent unnecessary recalculations
  const columnDefs = useMemo(
    () => createColumnDefs(menuSelected),
    [menuSelected]
  );

  return (
    <Row className="repo-welcome">
      <Col lg={12} md={12} sm={12}>
        <div>
          <Row>
            {/* Left Menu */}
            <Col
              lg={menuCollapsed ? 1 : 2}
              md={menuCollapsed ? 1 : 3}
              sm={12}
              style={{ transition: 'all 0.3s ease' }}
            >
              <div
                className="generic-hub-menu"
                style={styles.menuContainer(menuCollapsed)}
              >
                {/* Menu Toggle Button */}
                <div
                  style={{
                    textAlign: menuCollapsed ? 'center' : 'right',
                    marginBottom: '15px',
                  }}
                >
                  <Button
                    bsSize="small"
                    onClick={toggleMenu}
                    style={styles.menuToggle}
                  >
                    <i
                      className={`fa ${
                        menuCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'
                      }`}
                    />
                  </Button>
                </div>

                {/* Menu Items */}
                <div
                  style={
                    menuCollapsed
                      ? styles.collapsedButtonContainer
                      : styles.menuButtonContainer
                  }
                >
                  {MENU_ITEMS.map(item => (
                    <MenuButton
                      key={item.id}
                      item={item}
                      isSelected={menuSelected === item.id}
                      isCollapsed={menuCollapsed}
                      onClick={clickMenu}
                    />
                  ))}
                </div>
              </div>
            </Col>

            {/* Right Content */}
            <Col
              lg={menuCollapsed ? 11 : 10}
              md={menuCollapsed ? 11 : 9}
              sm={12}
              style={{ transition: 'all 0.3s ease' }}
            >
              <div className="repo-generic-hub-desc">
                {menuSelected === 'templates' && <RepoGenericHubDesc />}

                {menuSelected !== 'templates' && menuSelected && (
                  <div style={{ width: '100%', overflow: 'hidden' }}>
                    <GridHeader menuSelected={menuSelected} />
                    <div style={styles.gridContainer}>
                      <GenGridBase
                        columnDefs={columnDefs[menuSelected]}
                        rowData={gridData}
                        height="60vh"
                      />
                    </div>
                  </div>
                )}

                {!menuSelected && (
                  <div style={styles.welcomeContainer}>
                    <h4>Welcome to Generic Templates Hub</h4>
                    <p>
                      Please select a template type from the menu on the left to
                      view available templates.
                    </p>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </div>
      </Col>
    </Row>
  );
};

export default RepoGenericHub;
