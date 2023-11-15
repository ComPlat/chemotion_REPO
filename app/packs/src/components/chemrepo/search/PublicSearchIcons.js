import React, { useRef, useState } from 'react';
import { Row, Col, Radio, Well, Button, FormGroup } from 'react-bootstrap';
import AsyncSelect from 'react-select5/async';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';
import capitalizeFirstLetter from 'src/components/chemrepo/format-utils';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import RepoNavListTypes from 'src/repoHome/RepoNavListTypes';
import SuggestionsFetcher from 'src/fetchers/SuggestionsFetcher';

const constructHolder = (searchBy, searchIn) => {
  const holder = { authors: "author's name", ontologies: 'chemical methods ontology (1H NMR, mass spectrometry, ...)', sample: 'IUPAC, InChI, SMILES, ...' };
  return `Enter ${holder[searchBy]} to find information from ${searchIn === 'dataPublications' ? 'Data Publications' : 'Molecule Archive'}`;
};

const searchIcon = {
  chemotion_id: { icon: 'icon-sample', label: 'Chemotion Id' },
  sample_name: { icon: 'icon-sample', label: 'Sample Name' },
  sample_short_label: { icon: 'icon-sample', label: 'Sample Short Label' },
  sample_external_label: { icon: 'icon-sample', label: 'Sample External Label' },
  polymer_type: { icon: 'icon-polymer', label: 'Polymer' },
  reaction_name: { icon: 'icon-reaction', label: 'Reaction name' },
  reaction_status: { icon: 'icon-reaction', label: 'Reaction status' },
  reaction_short_label: { icon: 'icon-reaction', label: 'Reaction label' },
  reaction_rinchi_string: { icon: 'icon-reaction', label: 'Reaction RInChI' },
  wellplate_name: { icon: 'icon-wellplate', label: 'Wellplate' },
  screen_name: { icon: 'icon-screen', label: 'Screen' },
  iupac_name: { icon: 'icon-sample', label: 'Molecule' },
  inchistring: { icon: 'icon-sample', label: 'InChI' },
  inchikey: { icon: 'icon-sample', label: 'InChIKey' },
  cano_smiles: { icon: 'icon-sample', label: 'Canonical Smiles' },
  sum_formula: { icon: 'icon-sample', label: 'Sum Formula' },
  requirements: { icon: 'icon-screen', label: 'Requirement' },
  conditions: { icon: 'icon-screen', label: 'Condition' },
  element_short_label: { icon: 'icon-element', label: 'Element Short Label' },
  embargo: { icon: 'fa fa-object-group', label: 'Embargo Bundle Number' },
  authors: { icon: 'fa fa-user', label: 'Author' },
  ontologies: { icon: 'fa fa-area-chart', label: 'Ontology' }
};

const getLabelIcon = (key, label) => {
  if (searchIcon[key]) {
    return <>{label}&nbsp;(<i className={searchIcon[key].icon} aria-hidden="true" />&nbsp;{searchIcon[key].label})</>;
  }
  return <>{label}</>;
};

const updateLabel = (_searchBy, _label, _method) => {
  switch (_searchBy) {
    case 'authors':
    case 'ontologies':
      return getLabelIcon(_searchBy, _label);
    case 'sample':
      return getLabelIcon(_method, _label);
    default:
      return <>{_label}</>;
  }
};

const constructParams = (searchBy, searchIn, searchValue, searchOptions = []) => ({
  page: 1,
  perPage: 10,
  advFlag: true,
  advType: searchBy,
  advValue: [searchValue],
  schemeOnly: false,
  searchIn,
  searchOptions
});

const constructSearchParams = (input, options = []) => {
  const selection = options.filter(o => o.original.value === input.value);
  return {
    advFlag: true,
    elementType: 'all',
    page: 1,
    perPage: 10,
    selection: selection[0].original,
    isSearch: true,
  };
};

const PublicSearchIcons = () => {
  const [searchBy, setSearchBy] = useState('authors');
  const [searchIn, setSearchIn] = useState('dataPublications');
  const [searchValue, setSearchValue] = useState(null);
  const [searchOptions, setSearchOptions] = useState([]);
  const asyncRef = useRef(null);

  const loadOptions = (input) => {
    if (!input || input.length < 3) {
      setSearchOptions([]);
      return Promise.resolve([]);
    }
    if (searchBy === 'sample') {
      return SuggestionsFetcher.fetchSuggestionsForCurrentUser('all', input, 'public')
        .then((res) => {
          const result = res.map((u, index) => ({
            original: { ...u, value: `suggestion_${index}` },
            value: `suggestion_${index}`,
            name: u.name,
            label: updateLabel(searchBy, u.name, u.search_by_method)
          }));
          setSearchOptions(result);
          return result;
        })
        .catch((errorMessage) => { console.log(errorMessage); });
    }
    return PublicFetcher.fetchAdvancedValues(capitalizeFirstLetter(searchBy), input)
      .then((res) => {
        const result = res.result.map(u => ({
          original: u, value: u.key, name: u.name, label: updateLabel(searchBy, u.label, searchBy)
        }));
        setSearchOptions(result);
        return result;
      })
      .catch((errorMessage) => { console.log(errorMessage); });
  };

  // search by authors, ontologies, reaction, sample
  const onChangeSearchBy = (e) => {
    setSearchBy(e.target.value);
  };

  // search in publications, moleculeArchive
  const onChangeSearchIn = (e) => {
    setSearchIn(e.target.value);
  };

  const onChangeSearchValue = (_value) => {
    const pageParams = constructParams(capitalizeFirstLetter(searchBy), searchIn, _value, searchOptions);
    if (_value) {
      if (searchIn === 'dataPublications') {
        if (['authors', 'ontologies'].includes(searchBy)) {
          PublicActions.getReactions(pageParams);
          PublicActions.publicSearch.defer(pageParams);
        } else {
          const maParams = constructSearchParams(_value, searchOptions);
          PublicActions.getSearchReactions(maParams);
          PublicActions.publicSearch.defer({
            ...maParams, listType: RepoNavListTypes.REACTION, searchOptions: [], defaultSearchValue: _value.name
          });
        }
        PublicActions.openRepositoryPage.defer(`publications=${RepoNavListTypes.REACTION}`);
      } else {
        if (['authors', 'ontologies'].includes(searchBy)) {
          PublicActions.getMolecules({ ...pageParams, listType: RepoNavListTypes.MOLECULE_ARCHIVE });
          PublicActions.publicSearch.defer(pageParams);
        } else {
          const maParams = constructSearchParams(_value, searchOptions);
          PublicActions.getSearchMolecules({ ...maParams, listType: RepoNavListTypes.MOLECULE_ARCHIVE });
          PublicActions.publicSearch.defer({
            ...maParams, listType: RepoNavListTypes.MOLECULE_ARCHIVE, searchOptions: [], defaultSearchValue: _value.name
          });
        }
        PublicActions.openRepositoryPage.defer(`publications=${RepoNavListTypes.MOLECULE_ARCHIVE}`);
      }
    }
    setSearchValue(_value);
  };

  const onDrawStructure = () => {
    const listType = searchIn === 'dataPublications' ? RepoNavListTypes.REACTION : RepoNavListTypes.MOLECULE_ARCHIVE;
    PublicActions.openRepositoryPage(`publications=${listType}`);
    PublicActions.setSearchParams.defer({
      showStructureEditor: true, advFlag: true, advType: 'Authors', advValue: [], page: 1, searchOptions: []
    });
  };

  return (
    <Row style={{ width: '100%' }}>
      <Col md={12} sm={12} xs={12}>
        <Row>
          <Col md={2} smHidden xsHidden>&nbsp;</Col>
          <Col md={8} sm={12} xs={12} className="search-keyword">
            <Well bsSize="small">
              <span>Search by</span>
              &nbsp;&nbsp;
              <FormGroup>
                <Radio name="radioSearchBy" value="authors" checked={searchBy === 'authors'} inline onChange={onChangeSearchBy}>
                  <i className="fa fa-user" aria-hidden="true" />&nbsp;Author
                </Radio>{' '}
                <Radio name="radioSearchBy" value="ontologies" checked={searchBy === 'ontologies'} inline onChange={onChangeSearchBy}>
                  <i className="fa fa-area-chart" aria-hidden="true" />&nbsp;Ontology
                </Radio>{' '}
                <Radio name="radioSearchBy" value="sample" checked={searchBy === 'sample'} inline onChange={onChangeSearchBy}>
                  <i className="icon-sample" />&nbsp;Substance
                </Radio>&nbsp;&nbsp;or&nbsp;&nbsp;<Button bsSize="small" onClick={onDrawStructure}><i className="fa fa-paint-brush" aria-hidden="true" />&nbsp;Draw Structure</Button>
              </FormGroup>
            </Well>
            &nbsp;&nbsp;
            <Well bsSize="small">
              <span>in</span>
              &nbsp;&nbsp;
              <FormGroup>
                <Radio name="radioSearchIn" value="dataPublications" checked={searchIn === 'dataPublications'} inline onChange={onChangeSearchIn}>
                  Data Publications
                </Radio>{' '}
                <Radio name="radioSearchIn" value="moleculeArchive" checked={searchIn === 'moleculeArchive'} inline onChange={onChangeSearchIn}>
                  Molecule Archive
                </Radio>
              </FormGroup>
            </Well>
          </Col>
          <Col md={2} smHidden xsHidden>&nbsp;</Col>
        </Row>
        <Row style={{ marginBottom: '10px' }}>
          <Col md={2}>&nbsp;</Col>
          <Col md={8}>
            <AsyncSelect
              placeholder={constructHolder(searchBy, searchIn)}
              backspaceRemoves
              isClearable
              valueKey="value"
              labelKey="label"
              ref={asyncRef}
              loadOptions={loadOptions}
              onChange={onChangeSearchValue}
              styles={{
                container: baseStyles => ({
                  ...baseStyles,
                  width: '100%',
                }),
              }}
            />
            <span style={{ fontSize: '12px', fontStyle: 'italic' }}>Explore using the author&apos;s name, chemical methods ontology, IUPAC, InChI, SMILES..., or even draw a structure to search the Chemotion Repository.</span>
          </Col>
          <Col md={2}>&nbsp;</Col>
        </Row>
      </Col>
    </Row>
  );
};

export default PublicSearchIcons;
