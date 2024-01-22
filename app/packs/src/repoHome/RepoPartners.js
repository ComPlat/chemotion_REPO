import React from 'react';
import { Thumbnail } from 'react-bootstrap';
import PropTypes from 'prop-types';

function PartnerInfo(info) {
  const { header, img, content } = info;
  const imgSrc = `/images/repo/${img}`;

  return (
    <Thumbnail alt={header} src={imgSrc} className="partners-info" key={img}>
      <div className="info">
        <h4>{header}</h4>
        <p>{content}</p>
      </div>
    </Thumbnail>
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
      'The KIT foundation honors excellent contributions to chemistry research with the Chemotion Award.',
  },
  {
    header: 're3data',
    img: 're3data_Logo_RGB_free.png',
    content:
      'Karlsruhe Institute of Technology Registry of Research Data Repositories',
  },
  {
    header: 'DFG',
    img: 'dfg_logo_schriftzug_blau_foerderung_en.jpg',
    content: 'Funded by Deutsche Forschungsgemeinschaft.',
  },
  // {
  //   header: 'Inchitrust',
  //   img: 'InChITRUST.png',
  //   content: 'The KIT has a Supporter Membership.',
  // },
  {
    header: 'NFDI4Chem',
    img: 'NFDI4Chem-Logo_mehrfarbig_schwarz.png',
    content:
      'NFDI4Chem is building an open and FAIR infrastructure for research data management in chemistry.',
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
  // {
  //   header: 'Pubmed',
  //   img: 'pubchem.jpg',
  //   content: 'All compounds are automatically registered with PubChem.',
  // },
  // {
  //   header: 'Thomson Reuters',
  //   img: 'DCIbadge.png',
  //   content:
  //     'Datasets are automatically registered at the Data Citation Index.',
  // },
  {
    header: 'Database API',
    img: 'OAI.png',
    content:
      'The molecule and dataset metadata are available via a low-barrier mechanism for repository interopability.',
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
