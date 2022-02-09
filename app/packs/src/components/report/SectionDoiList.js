import React from 'react';
import SVG from 'react-inlinesvg';
import { Table, Tooltip, OverlayTrigger } from 'react-bootstrap';
import ReportActions from '../actions/ReportActions';
import ReportStore from '../stores/ReportStore';
import { UserSerial } from '../utils/ReportHelper';
import ReportsFetcher from '../fetchers/ReportsFetcher';


const svgPath = (svg, type) => {
  if (svg && svg !== '***') {
    if (type === 'Reaction') {
      return `/images/reactions/${svg}`;
    }
    return `/images/samples/${svg}`;
  }
  return 'images/wild_card/no_image_180.svg';
};

export default class SectionDoiList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      objs: props.objs,
      molSerials: props.molSerials,
      dois: []
    };

    this.initGetDoi = this.initGetDoi.bind(this);
  }
  componentDidMount() {
    this.initGetDoi();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.objs && nextProps.objs.length > 0) {
      if (this.state.objs.length !== nextProps.objs.length) {
        this.setState({ objs: nextProps.objs });
        this.initGetDoi();
      }
    }
    return true;
  }

  initGetDoi() {
    ReportsFetcher.getDois(this.props.objs)
      .then((result) => {
        this.setState({
          dois: result.dois
        })
      });
  }

  render() {
    const { dois } = this.state;
    let doiTbl = <span />
    if (dois && dois.length > 0) {
      doiTbl = dois.map((e) => {
        let ds = <div />;
        if (typeof (e.dois) !== 'undefined' && e.dois && e.dois.length > 0) {
          ds = e.dois.map(d => d == null ? <div/> : (<div>{d}<br /></div>) )
        }
        return (
          <tr key={e.element_id}>
            <td style={{ width: '30%' }}>
              <div>
                <SVG src={svgPath(e.svg, e.element_type)} className="molecule-mid" key={e.svg} />
              </div>
            </td>
            <td style={{ width: '70%' }}>{ds}</td>
          </tr>
        )
      });
    }
    return (
      <Table striped bordered hover>
        <thead>
          <tr>
            <th width="30%">SVG</th>
            <th width="70%">DOI</th>
          </tr>
        </thead>
        <tbody>
          { doiTbl }
        </tbody>
      </Table>
    );
  }
}
