import React, { useState, useEffect } from 'react';
import Select from 'react-select'
import CreatableSelect from 'react-select/lib/Creatable';
import { Button, Modal, Table } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import uuid from 'uuid';

import UserSettingsFetcher from 'src/fetchers/UserSettingsFetcher';

function Affiliations({ show, onHide }) {
  const [affiliations, setAffiliations] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState({});
  const [groupOptions, setGroupOptions] = useState({});
  const [inputError, setInputError] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  const currentEntries = affiliations.filter((entry) => entry.current);

  // Load all affiliation data at once
  const loadAffiliationData = () => {
    UserSettingsFetcher.fetchAffiliationData()
      .then(data => {
        // Create options for organizations - now uses the nested structure
        const orgs = Object.keys(data.organizations || {}).map(org => ({
          value: org,
          label: org
        }));
        setOrgOptions(orgs);

        // Set country options from all_data
        const countries = (data.countries || []).map(country => ({
          value: country,
          label: country
        }));
        setCountryOptions(countries);

        // Set loaded flag
        setDataLoaded(true);
      })
      .catch(error => {
        console.error("Error loading affiliation data:", error);
      });
  };

  // Get departments for a specific organization
  const getDepartmentOptions = (organization) => {
    if (!organization) return [];

    return UserSettingsFetcher.getDepartmentOptions(organization)
      .then(options => {
        // Cache department options in state
        setDeptOptions(prevState => ({
          ...prevState,
          [organization]: options
        }));
        return options;
      });
  };

  // Get groups for a specific organization and department
  const getGroupOptions = (organization, department) => {
    if (!organization || !department) return [];

    return UserSettingsFetcher.getGroupOptions(organization, department)
      .then(options => {
        // Cache group options in state with key that combines org and dept
        const key = `${organization}|${department}`;
        setGroupOptions(prevState => ({
          ...prevState,
          [key]: options
        }));
        return options;
      });
  };

  const getAllAffiliations = () => {
    UserSettingsFetcher.getAllAffiliations()
      .then((data) => {
        setAffiliations(data.map((item) => (
          {
            ...item,
            disabled: true,
            current: (item.from === null && item.to === null) ||
                     (item.from && moment(item.from).isBefore(moment()) &&
                      (item.to === null || moment(item.to).isAfter(moment())))
          }
        )));
      });
    setErrorMsg('');
    setInputError({});
  };

  useEffect(() => {
    // Removed old countries fetch, now handled in loadAffiliationData
    loadAffiliationData();

    // Load user's affiliations
    getAllAffiliations();
  }, []);

  const handleCreateOrUpdateAffiliation = (index) => {
    const params = affiliations[index];
    const callFunction = params.id ? UserSettingsFetcher.updateAffiliation : UserSettingsFetcher.createAffiliation;

    callFunction(params)
      .then(() => getAllAffiliations())
      .catch((error) => {
        console.error(error);
      });
  };

  const handleDeleteAffiliation = (index) => {
    const { id } = affiliations[index];
    if (id) {
      UserSettingsFetcher.deleteAffiliation(id)
        .then((result) => {
          if (result.error) {
            console.error(result.error);
            return false;
          }
          getAllAffiliations();
        });
    } else {
      // For newly added rows that don't have an ID yet, just remove from state
      const updatedAffiliations = [...affiliations];
      updatedAffiliations.splice(index, 1);
      setAffiliations(updatedAffiliations);
    }
  };

  const onChangeHandler = (index, field, value) => {
    const updatedAffiliations = [...affiliations];
    const prevValue = updatedAffiliations[index][field];
    updatedAffiliations[index][field] = value;
    const newInputErrors = { ...inputError };

    // Handle specific field validations and dependencies
    if (field === 'to' && updatedAffiliations[index].from > value) {
      newInputErrors[index] = { ...newInputErrors[index], to: true };
      setErrorMsg('Invalid date');
    } else if (field === 'organization') {
      // Organization validation
      if (value) {
        if (value.length < 8) {
          // Check minimum length
          newInputErrors[index] = { ...newInputErrors[index], organization: true };
          setErrorMsg('Organization name must be at least 8 characters');
        } else if (/www|\/|@|[^\w\s\-.,()äöüÄÖÜßøéÉà']/.test(value)) {
          // Explicitly allow alphanumeric, spaces, hyphens, parentheses, commas, periods, and umlauts
          // But disallow www, /, @, and other special characters
          newInputErrors[index] = { ...newInputErrors[index], organization: true };
          setErrorMsg('Only letters, numbers, spaces, hyphens, parentheses, commas and periods are allowed');
        } else if (newInputErrors[index] && newInputErrors[index].organization) {
          // Clear organization error if it's valid now
          delete newInputErrors[index].organization;
          if (Object.keys(newInputErrors[index]).length === 0) {
            delete newInputErrors[index];
          }
        }

        // Reset department and group when organization changes
        if (prevValue !== value) {
          updatedAffiliations[index].department = '';
          updatedAffiliations[index].group = '';

          // Pre-load department options for this organization
          getDepartmentOptions(value);
        }
      }
    } else if (field === 'department') {
      // Reset group when department changes
      if (prevValue !== value) {
        updatedAffiliations[index].group = '';

        // Pre-load group options for this organization and department
        const org = updatedAffiliations[index].organization;
        if (org && value) {
          getGroupOptions(org, value);
        }
      }
    } else if (newInputErrors[index]) {
      delete newInputErrors[index][field];
      if (Object.keys(newInputErrors[index]).length === 0) {
        delete newInputErrors[index];
      }
    }

    setInputError(newInputErrors);
    setAffiliations(updatedAffiliations);
  };

  const handleSaveButtonClick = (index) => {
    const updatedAffiliations = [...affiliations];
    const newInputErrors = { ...inputError };

    // Check organization field explicitly for all validation rules
    if (!updatedAffiliations[index].organization || updatedAffiliations[index].organization.length < 8) {
      newInputErrors[index] = { ...newInputErrors[index], organization: true };
      setErrorMsg('Organization name must be at least 8 characters');
      setInputError(newInputErrors);
      return;
    } else if (/www|\/|@|[^\w\s\-.,()äöüÄÖÜßøéÉà']/.test(updatedAffiliations[index].organization)) {
      newInputErrors[index] = { ...newInputErrors[index], organization: true };
      setErrorMsg('Only letters, numbers, spaces, hyphens, parentheses, commas, and periods are allowed');
      setInputError(newInputErrors);
      return;
    }

    if (!newInputErrors[index] || !Object.keys(newInputErrors[index]).length) {
      updatedAffiliations[index].disabled = true;
      setAffiliations(updatedAffiliations);
      handleCreateOrUpdateAffiliation(index);
    }
  };

  // Get current department options for a specific affiliation in the table
  const getCurrentDepartmentOptions = (index) => {
    const organization = affiliations[index]?.organization;
    if (!organization) return [];

    // If we already have options for this organization in cache, use them
    if (deptOptions[organization]) {
      return deptOptions[organization];
    }

    // Otherwise, return empty array and trigger loading
    if (dataLoaded) {
      getDepartmentOptions(organization);
    }
    return [];
  };

  // Get current group options for a specific affiliation in the table
  const getCurrentGroupOptions = (index) => {
    const organization = affiliations[index]?.organization;
    const department = affiliations[index]?.department;
    if (!organization || !department) return [];

    // Create a key for the cache
    const key = `${organization}|${department}`;

    // If we already have options for this org+dept in cache, use them
    if (groupOptions[key]) {
      return groupOptions[key];
    }

    // Otherwise, return empty array and trigger loading
    if (dataLoaded && organization && department) {
      getGroupOptions(organization, department);
    }
    return [];
  };

  return (
    <Modal
      bsSize="lg"
      dialogClassName="importChemDrawModal"
      show={show}
      onHide={onHide}
      backdrop="static"
    >
      <Modal.Header closeButton onHide={onHide}>
        <Modal.Title>
          <h3>My affiliations </h3>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="current-container">
          <h4 className="align-title"> Current affiliations</h4>
          <div className="entry-container">
            {currentEntries.map((entry) => (
              <div key={uuid.v4()} className="entry-box">
                <p>
                  <strong>Country:</strong>
                  {' '}
                  {entry.country}
                </p>
                <p>
                  <strong>Organization:</strong>
                  {' '}
                  {entry.organization}
                  {entry.ror_id && (
                  <a
                    href={`https://ror.org/${entry.ror_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View in Research Organization Registry"
                    className="ror-icon-link"
                  >
                    <img
                      src="/images/ror-icon-rgb.svg"
                      alt="ROR"
                      style={{
                        height: '1em',
                        marginLeft: '5px',
                        verticalAlign: 'text-top'
                      }}
                    />
                  </a>
                )}
                </p>
                <p>
                  <strong>Department:</strong>
                  {' '}
                  {entry.department}
                </p>
                <p>
                  <strong>Group:</strong>
                  {' '}
                  {entry.group}
                </p>
                <p>
                  <strong>From:</strong>
                  {' '}
                  {entry.from}
                </p>
                <p>
                  <strong>To:</strong>
                  {' '}
                  {entry.to}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', marginTop: '1rem'
        }}
        >
          <Button
            bsStyle="primary"
            onClick={() => {
              setAffiliations((prev) => [...prev, {
                country: '',
                organization: '',
                department: '',
                group: '',
                from: '',
                to: '',
                disabled: false,
              }]);
            }}
          >
            Add affiliation &nbsp;
            <i className="fa fa-plus" />
          </Button>
        </div>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Country</th>
              <th>Organization</th>
              <th>Department</th>
              <th>Working Group</th>
              <th>From</th>
              <th>To</th>
              <th />
            </tr>
          </thead>
          <tbody>

            {affiliations.map((item, index) => (
              <tr key={item.id || `new-${index}`}>
                <td>
                  {item.disabled ? item.country
                    : (
                      <Select
                        disabled={item.disabled}
                        placeholder="Select or enter a new option"
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        options={countryOptions}
                        value={item.country ? { value: item.country, label: item.country } : null}
                        isSearchable
                        isClearable
                        onChange={(choice) => onChangeHandler(index, 'country', !choice ? '' : choice.value)}
                      />
                    )}
                </td>
                <td>
                {item.disabled ? (
                  <>
                    {item.organization}
                    {item.ror_id && (
                      <a
                        href={`https://ror.org/${item.ror_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View in Research Organization Registry"
                        className="ror-icon-link"
                      >
                        <img
                          src="/images/ror-icon-rgb.svg"
                          alt="ROR"
                          style={{
                            height: '1em',
                            marginLeft: '5px',
                            verticalAlign: 'text-top'
                          }}
                        />
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <CreatableSelect
                      required
                      components={{ DropdownIndicator: () => null }}
                      disabled={item.disabled}
                      placeholder={inputError[index] && inputError[index].organization ?
                        errorMsg : "Select an option"}
                      options={orgOptions}
                      value={item.organization ? { value: item.organization, label: item.organization } : null}
                      isClearable
                      className={inputError[index] && inputError[index].organization ? 'error-control' : ''}
                      onChange={(choice) => onChangeHandler(index, 'organization', !choice ? '' : choice.value)}
                    />
                    {inputError[index] && inputError[index].organization && (
                      <small className="text-danger">{errorMsg}</small>
                    )}
                  </>
                )}
                </td>
                <td>
                  {item.disabled ? item.department
                    : (
                      <CreatableSelect
                        isCreatable
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        disabled={item.disabled || !item.organization}
                        placeholder={!item.organization ? "Select organization first" : "Select or enter a new option"}
                        options={getCurrentDepartmentOptions(index)}
                        value={item.department ? { value: item.department, label: item.department } : null}
                        isSearchable
                        isClearable
                        onChange={(choice) => onChangeHandler(index, 'department', !choice ? '' : choice.value)}
                      />
                    )}
                </td>
                <td>
                  {item.disabled ? item.group
                    : (
                      <CreatableSelect
                        isCreatable
                        placeholder={!item.department ? "Select department first" : "Select or enter a new option"}
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        disabled={item.disabled || !item.organization || !item.department}
                        options={getCurrentGroupOptions(index)}
                        value={item.group ? { value: item.group, label: item.group } : null}
                        isSearchable
                        closeMenuOnSelect
                        isClearable
                        onChange={(choice) => onChangeHandler(index, 'group', !choice ? '' : choice.value)}
                      />
                    )}
                </td>
                <td>
                  <DatePicker
                    placeholderText={inputError[index] && inputError[index].from ? errorMsg : ''}
                    isClearable
                    clearButtonTitle="Clear"
                    className={inputError[index] && inputError[index].from ? 'error-control' : ''}
                    showPopperArrow={false}
                    disabled={item.disabled}
                    showMonthYearPicker
                    dateFormat="yyyy-MM"
                    selected={item.from ? moment(item.from).toDate() : null}
                    onChange={(date) => onChangeHandler(index, 'from', date ? moment(date).format('YYYY-MM') : null)}
                  />
                </td>
                <td>
                  <DatePicker
                    placeholderText={inputError[index] && inputError[index].to ? errorMsg : ''}
                    isClearable
                    clearButtonTitle="Clear"
                    className={inputError[index] && inputError[index].to ? 'error-control' : ''}
                    showPopperArrow={false}
                    disabled={item.disabled}
                    showMonthYearPicker
                    dateFormat="yyyy-MM"
                    selected={item.to ? moment(item.to).toDate() : null}
                    onChange={(date) => onChangeHandler(index, 'to', date ? moment(date).format('YYYY-MM') : null)}
                  />
                </td>
                <td>
                  <div className="pull-right">
                    {item.disabled
                      ? (
                        <Button
                          bsSize="small"
                          bsStyle="primary"
                          onClick={() => {
                            const updatedAffiliations = [...affiliations];
                            updatedAffiliations[index].disabled = false;
                            setAffiliations(updatedAffiliations);
                          }}
                        >
                          <i className="fa fa-edit" />
                        </Button>
                      )
                      : (
                        <Button
                          bsSize="small"
                          bsStyle="warning"
                          onClick={() => handleSaveButtonClick(index)}
                        >
                          <i className="fa fa-save" />
                        </Button>
                      )}
                    <Button
                      style={{ marginLeft: '1rem' }}
                      bsSize="small"
                      bsStyle="danger"
                      onClick={() => handleDeleteAffiliation(index)}
                    >
                      <i className="fa fa-trash-o" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
    </Modal>
  );
}

export default Affiliations;
