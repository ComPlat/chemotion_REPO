import React from 'react';
import { Col, Row, Panel } from 'react-bootstrap';
import { OrcidIcon } from 'src/repoHome/RepoCommon';

function RepoAbout() {
  const bodyStyle = {
    maxHeight: 'calc(100vh - 262px)',
    overflowY: 'auto',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
    padding: '30px',
    textAlign: 'center'
  };

  return (
    <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
      <Col md={3} />
      <Col md={6}>
        <Panel style={{ border: 'none' }}>
          <Panel.Heading style={{ backgroundColor: 'white', border: 'none' }}>
            <CardIcons />
          </Panel.Heading>
          <Panel.Body style={bodyStyle}>
            <CardAbout />
          </Panel.Body>
        </Panel>
      </Col>
      <Col md={3} />
    </Row>
  );
}

function CardIcons() {
  return (
    <div className="card-icons">
      <Col md={4}>
        <img src="/images/repo/KIT.svg" alt="Karlsruhe Institute of Technology" />
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
      <p>This development is part of the work of the Stefan Bräse group at the KIT.</p>
      <br />
      <h2>Project description and mission</h2>
      <div style={{ textAlign: 'justify' }}>
        <p>
          The repository Chemotion was developed as a freely available infrastructure for the
          publication of research data in order to increase the amount of available data and
          to improve the quality of the information obtained and published.
        </p>
        <p>
          The aim of Chemotion repository is to make a substantial contribution to securing
          research results in a cost-efficient and simple manner, to support scientists, in
          particular chemists, in their efforts to generate FAIR data and to increase the
          visibility of research data in the domain of chemistry.
        </p>
        <p>
          Free access to and free use of scientific data is one principle of this project
          allowing and promoting collaborative work and scientific exchange among scientists.
          We think that openly available data is the prerequisite for better science in terms
          of more efficient and sustainable work but also with respect to a faster progress of
          science in general.
        </p>
        <p>
          To date, a lot of research data in chemistry is not made available due to technical
          limitations and missing infrastructure. Chemotion repository can be used to overcome
          these limitations - providing an option for the chemistry community to collect and
          share data on chemical reactions and analytical data of chemical compounds. The
          repository can be used to build data collections as an alternative to commercial
          databases.
        </p>
        <p>
          The mission of Chemotion repository is supported by its host institution KIT and
          the science data center MoMaF as well as the National Research Data Infrastructure
          NFDI4Chem.
        </p>
      </div>
      <br />
      <h2>Chemotion repository and related projects</h2>
      <div style={{ textAlign: 'justify' }}>
        <p>
          Chemotion repository is one of several projects that are built to support research
          data management in chemistry.
          It can be used as stand alone software for the publication of research data or it
          can be used in combination with chemotion ELN (electronic lab notebook), an open source
          software for the documentation of research data. Both system are being developed on the
          same technological level which allows a combination of recording and documentation as
          well as publication and storage of data sets. The ELN enables a fast and easy transfer
          of selected research data to the repository as a requirement for efficient strategies
          for the publication of research data.
        </p>
      </div>
      <br />
      <h3>Imprint</h3>
      <h4>Karlsruhe Institute of Technology</h4>
      <h4>Leader of the research group</h4>
      <p>
        <OrcidIcon orcid="0000-0003-4845-3191" />
        {' Prof. Stefan Bräse'}
      </p>
      <p>Institute of Organic Chemistry</p>
      <p>Fritz-Haber-Weg 6, Building 30.42</p>
      <p>76131 Karlsruhe </p>
      <p>Germany</p>
      <br />
      <p>Institute of Biological and Chemical Systems – Functional Molecular Systems (IBCS-FMS)</p>
      <p>Hermann-von-Helmholtz-Platz 1, Building 341</p>
      <p>76344 Eggenstein-Leopoldshafen</p>
      <p>Germany</p>
      <p>Phone: +49 721 608 42903</p>
      <p>Fax: +49 721 608 48581</p>
      <br />
      <p />
      <a href="http://www.ioc.kit.edu/braese/" target="_blank" rel="noopener noreferrer">Research Group Bräse</a>
      <br />
      <h4>Office Campus North (KIT)</h4>
      <p>
        <OrcidIcon orcid="0000-0001-9513-2468" />
        {' Dr. Nicole Jung'}
      </p>
      <p>Institute of Organic Chemistry</p>
      <p>Institute of Biological and Chemical Systems – Functional Molecular Systems (IBCS-FMS)</p>
      <p>Hermann-von-Helmholtz-Platz 1, Building 319</p>
      <p>76344 Eggenstein-Leopoldshafen </p>
      <p>Germany</p>
      <p>Phone: +49 721 608 24697 </p>
      <br />
      <h4>Authors</h4>
      <p>
        {' '}
        <OrcidIcon orcid="0000-0003-4845-3191" />
        {' Prof. Stefan Bräse'}
      </p>
      <p>
        <OrcidIcon orcid="0000-0001-9513-2468" />
        {' Dr. Nicole Jung'}
      </p>
      <p>
        <OrcidIcon orcid="0000-0002-0487-3947" />
        {' Dr. Pierre Tremouilhac '}
        <OrcidIcon orcid="0000-0002-9976-4507" />
        {' Pei-Chi Huang '}
        <OrcidIcon orcid="0000-0002-9772-0455" />
        {' Chia-Lin Lin '}
        <OrcidIcon orcid="0000-0002-4261-9886" />
        {' Dr. Yu-Chieh Huang '}
        <OrcidIcon orcid="0000-0002-1692-6778" />
        {' Dr. An Nguyen '}
        <OrcidIcon orcid="0000-0002-5035-7978" />
        {' Dr. Felix Bach'}
      </p>
      <br />
      <h3>Copyright Notices</h3>
      <div style={{ textAlign: 'justify' }}>
        <p>
          Unless otherwise stated,
          {' '}
          <i>chemotion-repository</i>
          {' '}
          and/or its contributors own
          the intellectual property rights in the website and material on the website.
          Subject to the license below, all these intellectual property rights are reserved.
          <br />
          Each content contributed and published by a user can be made available under one of
          the following licenses that the contributing user has chosen during the publication
          process:
        </p>
        <ul>
          <li>
            <a
              rel="license noopener noreferrer external"
              target="_blank"
              href="https://creativecommons.org/licenses/by-sa/4.0/"
            >
              <img
                src="https://mirrors.creativecommons.org/presskit/buttons/80x15/svg/by-sa.svg"
                style={{ borderStyle: 'none' }}
                alt="CC BY SA"
              />
              {' '}
              Creative Commons Attribution-ShareAlike 4.0 International License
            </a>
          </li>
          <li>
            <a
              rel="license noopener noreferrer external"
              target="_blank"
              href="https://creativecommons.org/licenses/by/4.0/"
            >
              <img
                src="https://mirrors.creativecommons.org/presskit/buttons/80x15/svg/by.svg"
                style={{ borderStyle: 'none' }}
                alt="CC BY"
              />
              {' '}
              Creative Commons Attribution 4.0
            </a>
          </li>
          <li>
            <a
              rel="license noopener noreferrer external"
              target="_blank"
              href="http://creativecommons.org/publicdomain/zero/1.0/"
            >
              <img
                src="https://mirrors.creativecommons.org/presskit/buttons/80x15/svg/cc-zero.svg"
                style={{ borderStyle: 'none' }}
                alt="CC0"
              />
              {' '}
              CC0 1.0 Universal
            </a>
          </li>
        </ul>
        <p>
          The contributing user may select the type of license during the publication process or
          choose not to apply any license.
          Contributors should be aware that some research data is not suitable for a licensing
          option as it may be in the public domain. Public domain data should be added without a
          license if this is apparent.
        </p>
        <p>
          The source code of the chemotion REPOSITORY web server and client is currently licensed under the
          {' '}
          <a
            rel="license"
            href="https://github.com/ComPlat/chemotion_REPO/blob/chemotion_REPO/LICENSE"
          >
            GNU Affero General Public License v3.0
          </a>
          .
          The code can be found on
          {' '}
          <a href="https://github.com/complat/chemotion_REPO" target="_blank" rel="noopener noreferrer">github</a>
          .
        </p>
        <p>DOI®, DOI.ORG®, and shortDOI® are trademarks of the International DOI Foundation.</p>
        <br />
      </div>

      <h3>Content</h3>
      <div style={{ textAlign: 'justify' }}>
        <p>
          All texts, pictures and other information published here are subject to
          copyright. The logo may not be used without the prior consent
          of the working group.
          A change of the logo is not permitted. The contents of our website are
          created with the utmost care. Nevertheless, no guarantee for topicality
          and completeness can be taken over. The Compound Platform does not
          assume any responsibility for any web content connected by a link,
          as this is not its own content.
        </p>
      </div>
    </div>
  );
}

export default RepoAbout;
