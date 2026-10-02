import React from 'react';
import { Card } from 'react-bootstrap';
import PropTypes from 'prop-types';

function PartnerInfo(info) {
  const { header, img, content } = info;
  const imgSrc = `/images/repo/${img}`;

  return (
    <Card className="partners-info" key={img}>
      <Card.Img variant="top" src={imgSrc} alt={header} />
      <Card.Body className="info">
        <Card.Title as="h4">{header}</Card.Title>
        <Card.Text>{content}</Card.Text>
      </Card.Body>
    </Card>
  );
}

const Infos = [
  {
    header: 'KIT',
    img: 'KIT.svg',
    content: 'Karlsruher Institut für Technologie',
  },
  {
    header: 'KIT Stiftung',
    img: 'KITStiftung.svg',
    content:
      'Honors excellent chemistry research with the Chemotion Award.',
  },
  {
    header: 're3data',
    img: 're3data_Logo_RGB_free.png',
    content: 'Registry of Research Data Repositories.',
  },
  {
    header: 'DFG',
    img: 'dfg_logo_schriftzug_blau_foerderung_en.jpg',
    content: 'Funded by Deutsche Forschungsgemeinschaft.',
  },
  {
    header: 'NFDI4Chem',
    img: 'NFDI4Chem-Logo_mehrfarbig_schwarz.png',
    content:
      'Open, FAIR infrastructure for chemistry research data.',
  },
  {
    header: 'RIsources',
    img: 'ri_logo.png',
    content: 'Listed in the DFG catalogue for Research Infrastructures.',
  },
  {
    header: 'Datacite',
    img: 'DataCite-Logos_secondary.svg',
    content: 'Helping you to find, access, and reuse data.',
  },
  {
    header: 'Database API',
    img: 'OAI.png',
    content:
      'Molecule and dataset metadata exposed for repository interoperability.',
  },
];
function Partners({ start = 0, end = 0 }) {
  return (
    <div className="partner-row">
      {Infos.slice(start, end).map((info, index) => PartnerInfo(info, index))}
    </div>
  );
}

Partners.propTypes = {
  start: PropTypes.number.isRequired,
  end: PropTypes.number.isRequired,
};

export default Partners;
