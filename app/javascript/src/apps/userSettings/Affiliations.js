import React, { useState, useEffect } from 'react';
import { CreatableSelect } from 'src/components/common/Select';
import { Button, Table } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import uuid from 'uuid';

import UserSettingsFetcher from 'src/fetchers/UserSettingsFetcher';

function Affiliations() {
  const [affiliations, setAffiliations] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  // Cached department options keyed by organization name.
  const [deptOptionsByOrg, setDeptOptionsByOrg] = useState({});
  // Cached group options keyed by `${organization}|${department}`.
  const [groupOptionsByKey, setGroupOptionsByKey] = useState({});
  const [inputError, setInputError] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  const currentEntries = affiliations.filter((entry) => entry.current);

  const getAllAffiliations = () => {
    UserSettingsFetcher.getAllAffiliations()
      .then((data) => {
        setAffiliations((data || []).map((item) => (
          {
            ...item,
            disabled: true,
            current: item.from !== null && item.to === null,
          }
        )));
      });
    setErrorMsg('');
    setInputError({});
  };

  useEffect(() => {
    UserSettingsFetcher.fetchAffiliationData()
      .then((data) => {
        const countries = (data?.countries || [])
          .filter((c) => c && c.length > 1)
          .map((c) => ({ value: c, label: c }));
        setCountryOptions(countries);

        const orgs = Object.keys(data?.organizations || {})
          .filter((o) => o && o.trim() !== '')
          .map((o) => ({ value: o, label: o }));
        setOrgOptions(orgs);
      })
      .catch((err) => console.error('Error loading affiliation data:', err));

    getAllAffiliations();
  }, []);

  const ensureDeptOptions = (org) => {
    if (!org || deptOptionsByOrg[org] !== undefined) return;
    UserSettingsFetcher.getDepartmentOptions(org)
      .then((options) => {
        setDeptOptionsByOrg((prev) => ({ ...prev, [org]: options || [] }));
      });
  };

  const ensureGroupOptions = (org, dept) => {
    if (!org || !dept) return;
    const key = `${org}|${dept}`;
    if (groupOptionsByKey[key] !== undefined) return;
    UserSettingsFetcher.getGroupOptions(org, dept)
      .then((options) => {
        setGroupOptionsByKey((prev) => ({ ...prev, [key]: options || [] }));
      });
  };

  const getDeptOptionsFor = (org) => (org ? deptOptionsByOrg[org] || [] : []);
  const getGroupOptionsFor = (org, dept) => (
    org && dept ? groupOptionsByKey[`${org}|${dept}`] || [] : []
  );

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
          if (result && result.error) {
            console.error(result.error);
            return false;
          }
          getAllAffiliations();
          return true;
        });
    } else {
      setAffiliations((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const onChangeHandler = (index, field, value) => {
    const updatedAffiliations = [...affiliations];
    const prevValue = updatedAffiliations[index][field];
    updatedAffiliations[index][field] = value;

    // When organization changes, reset department and group.
    if (field === 'organization' && prevValue !== value) {
      updatedAffiliations[index].department = '';
      updatedAffiliations[index].group = '';
      if (value) ensureDeptOptions(value);
    }
    // When department changes, reset group.
    if (field === 'department' && prevValue !== value) {
      updatedAffiliations[index].group = '';
      const org = updatedAffiliations[index].organization;
      if (org && value) ensureGroupOptions(org, value);
    }

    const newInputErrors = { ...inputError };
    if (field === 'from' && (updatedAffiliations[index].from === null || updatedAffiliations[index].from === '')) {
      newInputErrors[index] = { ...newInputErrors[index], from: true };
      setErrorMsg('Required');
    } else if (field === 'to' && updatedAffiliations[index].from > value) {
      newInputErrors[index] = { ...newInputErrors[index], to: true };
      setErrorMsg('Invalid date');
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
    if (!updatedAffiliations[index].from) {
      newInputErrors[index] = { ...newInputErrors[index], from: true };
      setInputError(newInputErrors);
      setErrorMsg('Required');
      return;
    }

    if (!newInputErrors[index] || !Object.keys(newInputErrors[index]).length) {
      updatedAffiliations[index].disabled = true;
      setAffiliations(updatedAffiliations);
      handleCreateOrUpdateAffiliation(index);
    }
  };

  return (
    <div>
      <h3>My affiliations </h3>
      <div className="current-container">
        <h4 className="align-title"> Current affiliations</h4>
        <div className="entry-container d-flex flex-wrap gap-2">
          {currentEntries.map((entry) => (
            <div
              key={uuid.v4()}
              className="entry-box border border-gray-300 rounded-2 p-2 shadow-sm"
              style={{ minWidth: '200px', maxWidth: '350px' }}
            >
              <p>
                <strong>Country:</strong>
                {' '}
                {entry.country}
              </p>
              <p>
                <strong>Organization:</strong>
                {' '}
                {entry.organization}
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
            </div>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', marginTop: '1rem'
      }}
      >
        <Button
          variant="primary"
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
                    <CreatableSelect
                      isDisabled={item.disabled}
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
                {item.disabled ? item.organization
                  : (
                    <CreatableSelect
                      required
                      components={{ DropdownIndicator: () => null }}
                      isDisabled={item.disabled}
                      placeholder="Select or enter a new option"
                      options={orgOptions}
                      value={item.organization ? { value: item.organization, label: item.organization } : null}
                      isClearable
                      onChange={(choice) => onChangeHandler(index, 'organization', !choice ? '' : choice.value)}
                    />
                  )}
              </td>
              <td>
                {item.disabled ? item.department
                  : (
                    <CreatableSelect
                      components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                      isDisabled={item.disabled}
                      placeholder="Select or enter a new option"
                      options={getDeptOptionsFor(item.organization)}
                      value={item.department ? { value: item.department, label: item.department } : null}
                      isSearchable
                      isClearable
                      onFocus={() => ensureDeptOptions(item.organization)}
                      onChange={(choice) => onChangeHandler(index, 'department', !choice ? '' : choice.value)}
                    />
                  )}
              </td>
              <td>
                {item.disabled ? item.group
                  : (
                    <CreatableSelect
                      placeholder="Select or enter a new option"
                      components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                      isDisabled={item.disabled}
                      options={getGroupOptionsFor(item.organization, item.department)}
                      value={item.group ? { value: item.group, label: item.group } : null}
                      isSearchable
                      closeMenuOnSelect
                      isClearable
                      onFocus={() => ensureGroupOptions(item.organization, item.department)}
                      onChange={(choice) => onChangeHandler(index, 'group', !choice ? '' : choice.value)}
                    />
                  )}
              </td>
              <td>
                <DatePicker
                  placeholderText={inputError[index] ? inputError[index].from ? errorMsg : '' : 'Required'}
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
                <div className="d-flex justify-content-end">
                  {item.disabled
                    ? (
                      <Button
                        size="sm"
                        variant="primary"
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
                        size="sm"
                        variant="warning"
                        onClick={() => handleSaveButtonClick(index)}
                      >
                        <i className="fa fa-save" />
                      </Button>
                    )}
                  <Button
                    style={{ marginLeft: '1rem' }}
                    size="sm"
                    variant="danger"
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
    </div>
  );
}

export default Affiliations;
