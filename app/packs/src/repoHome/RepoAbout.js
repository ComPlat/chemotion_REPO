import React from 'react';
import PropTypes from 'prop-types';
import { Col, Row, Panel } from 'react-bootstrap';
import { OrcidIcon } from 'src/repoHome/RepoCommon';

function DisplayName({ name, orcid }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        margin: '0 4px 10px 0',
      }}
    >
      {name}&nbsp;
      <OrcidIcon orcid={orcid} />
    </span>
  );
}

DisplayName.propTypes = {
  name: PropTypes.string.isRequired,
  orcid: PropTypes.string.isRequired,
};

function RepoAbout() {
  const bodyStyle = {
    maxHeight: 'calc(100vh - 262px)',
    overflowY: 'auto',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
    padding: '30px',
    textAlign: 'center',
  };

  return (
    <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
      <Col md={2} />
      <Col md={8}>
        <Panel style={{ border: 'none' }}>
          <Panel.Heading style={{ backgroundColor: 'white', border: 'none' }}>
            <CardIcons />
          </Panel.Heading>
          <Panel.Body style={bodyStyle}>
            <CardAbout />
          </Panel.Body>
        </Panel>
      </Col>
      <Col md={2} />
    </Row>
  );
}

function CardIcons() {
  return (
    <div className="card-icons">
      <Col md={4}>
        <img
          src="/images/repo/KIT.svg"
          alt="Karlsruhe Institute of Technology"
        />
      </Col>
      <Col md={4}>
        <img src="/images/repo/Chemotion-V1.png" alt="" />
      </Col>
      <Col md={4}>
        <img src="/images/repo/dfg_logo_schriftzug_blau.jpg" alt="" />
      </Col>
    </div>
  );
}

function CardAbout() {
  return (
    <div>
      <h4>
        This development is part of the work of the Stefan Bräse group at the
        KIT.
      </h4>
      <br />
      <h2>Project description and mission</h2>
      <div style={{ textAlign: 'justify' }}>
        <p>
          Chemotion Repository was developed as a freely available
          infrastructure for the publication of research data in order to
          increase the amount of available data and to improve the quality of
          the information obtained and published.
        </p>
        <p>
          The aim of Chemotion Repository is to make a substantial contribution
          to securing research results in a cost-efficient and simple manner, to
          support scientists, in particular chemists, in their efforts to
          generate FAIR data and to increase the visibility of research data in
          the domain of chemistry.
        </p>
        <p>
          Free access to and free use of scientific data is one principle of
          this project allowing and promoting collaborative work and scientific
          exchange among scientists. We think that openly available data is the
          prerequisite for better science in terms of more efficient and
          sustainable work but also with respect to a faster progress of science
          in general.
        </p>
        <p>
          To date, a lot of research data in chemistry is not made available due
          to technical limitations and missing infrastructure. Chemotion
          repository can be used to overcome these limitations - providing an
          option for the chemistry community to collect and share data on
          chemical reactions and analytical data of chemical compounds. The
          repository can be used to build data collections as an alternative to
          commercial databases.
        </p>
        <p>
          The mission of Chemotion Repository is supported by its host
          institution KIT and the science data center MoMaF as well as the
          National Research Data Infrastructure NFDI4Chem.
        </p>
      </div>
      <br />
      <h2>Chemotion Repository and related projects</h2>
      <div style={{ textAlign: 'justify' }}>
        <p>
          Chemotion Repository is one of several projects that are built to
          support research data management in chemistry. It can be used as stand
          alone software for the publication of research data or it can be used
          in combination with chemotion ELN (electronic lab notebook), an open
          source software for the documentation of research data. Both system
          are being developed on the same technological level which allows a
          combination of recording and documentation as well as publication and
          storage of data sets. The ELN enables a fast and easy transfer of
          selected research data to the repository as a requirement for
          efficient strategies for the publication of research data.
        </p>
      </div>
      <br />
      <h3>Karlsruhe Institute of Technology</h3>
      <h3>Leader of the research group</h3>
      <p>
        <DisplayName name="Prof. Dr. Stefan Bräse" orcid="0000-0003-4845-3191" />
      </p>
      <p>Institute of Organic Chemistry</p>
      <p>Fritz-Haber-Weg 6, Building 30.42</p>
      <p>76131 Karlsruhe </p>
      <p>Germany</p>
      <br />
      <p>
        Institute of Biological and Chemical Systems – Functional Molecular
        Systems (IBCS-FMS)
      </p>
      <p>Hermann-von-Helmholtz-Platz 1, Building 341</p>
      <p>76344 Eggenstein-Leopoldshafen</p>
      <p>Germany</p>
      <p>Phone: +49 721 608 42903</p>
      <p>Fax: +49 721 608 48581</p>
      <br />
      <p />
      <a
        href="http://www.ioc.kit.edu/braese/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Research Group Bräse{' '}
        <i className="fa fa-external-link" aria-hidden="true" />
      </a>
      <br />
      <h3>Office Campus North (KIT)</h3>
      <p>
        <DisplayName name="Dr. Nicole Jung" orcid="0000-0001-9513-2468" />
      </p>
      <p>Institute of Organic Chemistry</p>
      <p>
        Institute of Biological and Chemical Systems – Functional Molecular
        Systems (IBCS-FMS)
      </p>
      <p>Hermann-von-Helmholtz-Platz 1, Building 319</p>
      <p>76344 Eggenstein-Leopoldshafen </p>
      <p>Germany</p>
      <p>Phone: +49 721 608 24697 </p>
      <br />
      <h3>Authors</h3>
      <p>
        <DisplayName name="Prof. Dr. Stefan Bräse" orcid="0000-0003-4845-3191" />
      </p>
      <p>
        <DisplayName name="Dr. Nicole Jung" orcid="0000-0001-9513-2468" />
      </p>
      <p>
        <DisplayName
          name="Dr. Pierre Tremouilhac"
          orcid="0000-0002-0487-3947"
        />
        <DisplayName name="Pei-Chi Huang" orcid="0000-0002-9976-4507" />
        <DisplayName name="Chia-Lin Lin" orcid="0000-0002-9772-0455" />
        <DisplayName name="Dr. Yu-Chieh Huang" orcid="0000-0002-4261-9886" />
        <DisplayName name="Dr. An Nguyen" orcid="0000-0002-1692-6778" />
        <DisplayName name="Dr. Felix Bach" orcid="0000-0002-5035-7978" />
      </p>
    </div>
  );
}
export default RepoAbout;
