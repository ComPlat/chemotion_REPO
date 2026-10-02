import React from 'react';
import SVG from 'react-inlinesvg';
import { replace } from 'lodash';
import {
  Badge,
  Card,
  Col,
  Collapse,
  Form,
  InputGroup,
  Row,
  Table,
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import moment from 'moment';
import Sample from 'src/models/Sample';
import Quill2Viewer from 'src/repo/others/Quill2Viewer';
import InputButtonField from 'src/repo/others/InputButtonField';
import RepoReactionSchemeInfo from 'src/repo/repoHome/RepoReactionSchemeInfo';
import ReactionTable from 'src/repo/repoHome/RepoReactionTable';
import PublicReactionProperties from 'src/repo/chemrepo/PublicReactionProperties';
import PublicReactionTlc from 'src/repo/chemrepo/PublicReactionTlc';
import { ClipboardCopyLink } from './clipboard';

const CalcDuration = (reaction) => {
  let duration = null;

  if (reaction.duration && !!reaction.duration.match(/\d+/)) {
    return reaction.duration;
  }

  if (reaction.timestamp_start && reaction.timestamp_stop) {
    const start = moment(reaction.timestamp_start, 'DD-MM-YYYY HH:mm:ss');
    const stop = moment(reaction.timestamp_stop, 'DD-MM-YYYY HH:mm:ss');
    if (start < stop) {
      duration = moment.preciseDiff(start, stop);
    }
  }
  if (duration == null) {
    return '';
  }
  return duration;
};

const ToggleIndicator = ({ onClick, name, indicatorStyle }) => (
  <span
    role="presentation"
    className="btn btn-secondary btn-xsm rounded-0"
    onClick={onClick}
  >
    {name} &nbsp;<i className={`fa fa-caret-${indicatorStyle}`} aria-hidden="true" />
  </span>
);

ToggleIndicator.propTypes = {
  indicatorStyle: PropTypes.string,
  name: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

ToggleIndicator.defaultProps = {
  indicatorStyle: '',
  name: '',
};

const ReactionRinChiKey = ({
  reaction, toggle, show, bodyAttrs
}) => {
  const showIndicatorRinchi = (show) ? 'down' : 'right';
  return (
    <span>
      <ToggleIndicator onClick={toggle} name="RInChiKey Table" indicatorStyle={showIndicatorRinchi} />
      <Card style={{ border: 'none' }} id="collapsible-panel-rinchis" className="fs-6 fw-normal">
        <Collapse in={show}>
          <Card.Body {...bodyAttrs}>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>RInChI</b></Col>
              <Col sm={10} md={10} lg={10}><ClipboardCopyLink text={replace(reaction.rinchi_string, 'RInChI=', '')} /></Col>
            </Row>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>Long-RInChIKey</b></Col>
              <Col sm={10} md={10} lg={10}><ClipboardCopyLink text={replace(reaction.rinchi_long_key, 'Long-RInChIKey=', '')} /></Col>
            </Row>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>Short-RInChIKey</b></Col>
              <Col sm={10} md={10} lg={10}><ClipboardCopyLink text={replace(reaction.rinchi_short_key, 'Short-RInChIKey=', '')} /></Col>
            </Row>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>Web-RInChIKey</b></Col>
              <Col sm={10} md={10} lg={10}><ClipboardCopyLink text={replace(reaction.rinchi_web_key, 'Web-RInChIKey=', '')} /></Col>
            </Row>
          </Card.Body>
        </Collapse>
      </Card>
    </span>
  );
};

const InputFieldYield = (props) => {
  return (
    <Form.Group>
      <InputGroup>
        <Form.Control
          type="text"
          size="sm"
          value={props.value || 0}
          placeholder="Input Yield..."
          onChange={event => props.onInputChange(props.product, event)}
        />
        <InputGroup.Text>%</InputGroup.Text>
      </InputGroup>
    </Form.Group>
  );
};

const InputFieldDuration = props =>
  (
    <InputButtonField
      label="Duration"
      value={props.durationValue || ''}
      field="duration"
      btnValue={props.durationUnit || ''}
      btnField="durationUnit"
      onInputChange={props.onInputChange}
      onBtnClick={props.onUnitChange}
      btnTip="switch duration unit"
    />
  );

const InputFieldTemperture = props =>
  (
    <InputButtonField
      label="Temperature"
      value={props.temperatureDisplay || ''}
      field="temperature"
      btnValue={props.temperatureUnit || ''}
      btnField="temperatureUnit"
      onInputChange={props.onInputChange}
      onBtnClick={props.onUnitChange}
      btnTip="switch temperature unit"
    />
  );

const ReactionTableEdit = ({
  reaction, bodyAttrs, isPublic = true,
  onInputChange, show = true, toggle
}) => {
  let schemes = [];
  let sumSolvents = 0.0;

  if (isPublic) {
    schemes = reaction.schemes;
  } else {
    reaction.starting_materials.map((s) => {
      const ns = new Sample(s)
      ns.mat_group = 'starting_materials';
      schemes.push(ns);
    });
    reaction.reactants.map((s) => {
      const ns = new Sample(s)
      ns.mat_group = 'reactants';
      schemes.push(ns);
    });
    reaction.products.map((s) => {
      const ns = new Sample(s)
      ns.mat_group = 'products';
      schemes.push(ns);
    });
    reaction.solvents.map((s) => {
      const ns = new Sample(s)
      sumSolvents += ns.amount_l;
      ns.mat_group = 'solvents';
      schemes.push(ns);
    });
  }

  const materialCalc = (target, multi, precision) => (target ? (target * multi).toFixed(precision) : '0');
  const equivYield = (s, sumSolvents = 1.0, isPublic = true) => {
    let val = 0;
    switch (s.mat_group) {
      case 'products':
        val = materialCalc(s.equivalent * 100, 1, 0);
        break;
      default:
        return <div />;
    }
    return (
      <Form inline>
        <InputFieldYield
          value={val}
          product={s}
          onInputChange={onInputChange}
        />
      </Form>
    );
  };

  const rows = (samples) => {
    let currentType = '';

    return (
      typeof samples !== 'undefined'
        ? samples.map((sample, i) => {
          const matType = sample.mat_group && sample.mat_group[0].toUpperCase() + sample.mat_group.replace('_', ' ').slice(1);
          let label = isPublic ? sample.iupac_name : sample.molecule_iupac_name;
          if (sample.mat_group === 'solvents') label = sample.external_label;
          let title = null;
          if (currentType !== sample.mat_group) {
            currentType = sample.mat_group;
            title = (<tr><td colSpan="7"><b>{matType}</b></td></tr>);
          }
          return (
            <tbody key={i}>
              {title}
              <tr>
                <td style={{ width: '26%' }}>{label}</td>
                <td style={{ width: '12%' }}>{isPublic ? sample.sum_formular : sample.molecule.sum_formular}</td>
                <td style={{ width: '14%', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ width: '12%', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ width: '12%', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ width: '12%', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ width: '12%', textAlign: 'center' }}>{equivYield(sample, sumSolvents, isPublic)}</td>
              </tr>
            </tbody>
          );
        })
        : null
    )
  };

  const table = dataRows => (
    <Table responsive>
      <thead>
        <tr>
          <th>IUPAC</th>
          <th>Formula</th>
          <th style={{ textAlign: 'center' }}>Density/Molarity</th>
          <th style={{ textAlign: 'center' }}>Amount(g)</th>
          <th style={{ textAlign: 'center' }}>Volume(ml)</th>
          <th style={{ textAlign: 'center' }}>Amount(mmol)</th>
          <th style={{ textAlign: 'center' }}>Equiv/Yield</th>
        </tr>
      </thead>
      {dataRows}
    </Table>
  );

  return (
    <span>
      {toggle && <ToggleIndicator onClick={toggle} name="Reaction Table" indicatorStyle={show ? 'down' : 'right'} />}
      {!toggle && <Badge bg="secondary">Reaction Table</Badge>}
      <Card style={{ border: 'none' }} id="collapsible-panel-scheme">
        <Collapse in={show}>
          <Card.Body {...bodyAttrs} >
            <div>
              {table(rows(schemes))}
            </div>
          </Card.Body>
        </Collapse>
      </Card>
    </span>
  );
};

const ReactionPropertiesEdit = ({
  reaction, bodyAttrs,
  onInputChange, onUnitChange, show = true, toggle
}) =>
  (
    <span>
      {toggle && <ToggleIndicator onClick={toggle} name="Properties" indicatorStyle={show ? 'down' : 'right'} />}
      {!toggle && <Badge bg="secondary">Properties</Badge>}
      <Card style={{ border: 'none' }} id="collapsible-panel-properties">
        <Collapse in={show}>
          <Card.Body {...bodyAttrs}>
            <Row >
              <Col sm={4} md={4} lg={4}>
                <b>Status</b><div>{reaction.status}</div>
              </Col>
              <Col sm={4} md={4} lg={4}>
                <InputFieldTemperture
                  temperatureDisplay={reaction.temperature_display}
                  temperatureUnit={reaction.temperature && reaction.temperature.valueUnit}
                  onInputChange={onInputChange}
                  onUnitChange={onUnitChange}
                />
              </Col>
              <Col sm={4} md={4} lg={4}>
                <InputFieldDuration
                  durationValue={(reaction.durationDisplay && reaction.durationDisplay.dispValue) || ''}
                  durationUnit={reaction.durationUnit}
                  onInputChange={onInputChange}
                  onUnitChange={onUnitChange}
                />
              </Col>
            </Row>
          </Card.Body>
        </Collapse>
      </Card>
    </span>
  );

const ReactionSchemeOnlyInfo = ({
  reaction, isPublic = true, schemeDesc,
  onYieldChange, onPropertiesChange, onUnitChange
}) => {
  const svgPath = `/images/reactions/${reaction.reaction_svg_file}`;

  const bodyAttrs = {
    style: {
      fontSize: '90%',
      paddingBottom: 'unset'
    }
  };

  return (
    <Card style={{ marginBottom: '4px' }}>
      <Card.Body style={{ paddingBottom: '1px' }}>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <SVG key={svgPath} src={svgPath} className="reaction-details" />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionTableEdit
              reaction={reaction}
              bodyAttrs={bodyAttrs}
              isPublic={isPublic}
              onInputChange={onYieldChange}
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <Form.Check
              type="checkbox"
              checked={schemeDesc}
              onChange={() => { onPropertiesChange('schemeDesc'); }}
              label="add the description field?"
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionPropertiesEdit
              reaction={reaction}
              bodyAttrs={bodyAttrs}
              onInputChange={onPropertiesChange}
              onUnitChange={onUnitChange}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

const ReactionInfo = ({ reaction, toggleScheme, showScheme, isPublic = true,
  toggleRinchi, showRinchi,
  toggleProp, showProp,
  toggleTlc, showTlc,
  schemeOnly = false, onToggle = () => {}
 }) => {
  const svgPath = `/images/reactions/${reaction.reaction_svg_file}`;
  const content = reaction.description;
  const additionInfo = reaction.observation;

  const contentlength = (content && content.ops && content.ops.length > 0 && content.ops[0].insert) ? content.ops[0].insert.trim().length : 0;
  const additionlength = (additionInfo && additionInfo.ops && additionInfo.ops.length > 0 && additionInfo.ops[0].insert) ? additionInfo.ops[0].insert.trim().length : 0;

  const descQV = contentlength > 0 ?
  (<span className="expand-p"><b>Description:</b><Quill2Viewer value={content}  /></span>) : null;
  const addQV = additionlength > 0 ?
  (<span className="expand-p"><b>Additional information for publication and purification details:</b> <Quill2Viewer value={additionInfo}  /></span>) : null;


  const bodyAttrs = {
    style: {
      fontSize: '90%',
      paddingBottom: 'unset'
    }
  };

  if (schemeOnly) {
    return (
      <RepoReactionSchemeInfo
        reaction={reaction}
        svgPath={svgPath}
        showScheme={showScheme}
        showRinchi={showRinchi}
        showProp={showProp}
        bodyAttrs={bodyAttrs}
        onToggle={onToggle}
      />
    );
  }

  return (
    <Card style={{ marginBottom: '4px' }}>
      <Card.Body style={{ paddingBottom: '1px' }}>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <SVG key={svgPath} src={svgPath} className="reaction-details" />
          </Col>
        </Row>
        <Row className="mb-2">
          <Col sm={12} md={12} lg={12}>
            <ReactionTable
              reaction={reaction}
              toggle={toggleScheme}
              show={showScheme}
              isPublic={isPublic}
              isReview={false}
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <div className="desc small-p">
              {descQV}
            </div>
            <div className="desc small-p">
              {addQV}
            </div>
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionRinChiKey
              reaction={reaction}
              toggle={toggleRinchi}
              show={showRinchi}
              bodyAttrs={bodyAttrs}
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <PublicReactionProperties
              reaction={reaction}
              toggle={toggleProp}
              show={showProp}
              isPublished={false}
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <PublicReactionTlc
              reaction={reaction}
              toggle={toggleTlc}
              show={showTlc}
              isPublished={false}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

ReactionTable.propTypes = {
  reaction: PropTypes.any.isRequired,
  toggle: PropTypes.func,
  show: PropTypes.bool,
  bodyAttrs: PropTypes.object,
  isPublic: PropTypes.bool.isRequired
};

ReactionTable.defaultProps = {
  isPublic: true,
  showScheme: false
};

ReactionRinChiKey.propTypes = {
  reaction: PropTypes.any.isRequired,
  toggle: PropTypes.func,
  show: PropTypes.bool,
  bodyAttrs: PropTypes.object
};

export {
  CalcDuration,
  ToggleIndicator,
  ReactionRinChiKey,
  ReactionSchemeOnlyInfo,
  ReactionInfo,
};
