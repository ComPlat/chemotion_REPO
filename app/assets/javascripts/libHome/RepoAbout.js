import React from 'react';
import { Col, Row, Panel } from 'react-bootstrap';

const RepoAbout = () => {
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
};

const CardIcons = () =>
  (
    <div className="card-icons">
      <Col md={4}>
        <img src="/images/repo/KIT.png" alt="Karlsruhe Institute of Technology" />
      </Col>
      <Col md={4}>
        <img src="/images/repo/chemotion_full.svg" alt="" />
      </Col>
      <Col md={4}>
        <img src="/images/repo/dfg_logo.png" alt="" />
      </Col>
    </div>
  );

const CardAbout = () =>
  (
    <div>
      <p>This development is part of the work of the Stefan Bräse group at the KIT.</p>
      <br />
      <h1>Brief project description</h1>
      <div style={{ textAlign: 'justify' }}>
        <p>This project aims for the development of a freely available
          infrastructure for research data management through the development
          of two independent IT systems namely an electronic laboratory notebook
          (ELN) and a chemistry web repository. With the tools that will be
          established by our project group it will be possible to integrate
          modern web-techniques into the routine work of academic researchers,
           thereby increasing the amount of available data and improving the
           quality of the information obtained and published.
        </p>
        <p>The aim of this project is to make a substantial contribution to
          securing research results in a cost-effective and simple manner,
          and to optimally network in particular chemists (initially with each
            other and in a second step with other disciplines). The new model
             provides a combination of recording and documentation as well as
             publication and storage of data sets.
        </p>
        <p>The necessary IT structures for modern documentation of
          research data are developed within the scope of this project,
          will be summarized in an electronic laboratory notebook (ELN) and will
           be provided and distributed as OPEN SOURCE. The ELN will be completed
           by the establishment and hosting of the web-repository, for which a
           direct connection to the ELN enables a fast and easy transfer of
           selected research information.
        </p>
        <p>Free access and free use by academic researchers is
          one principle of this project allowing and promoting collaborative
          work and scientific exchange among scientists.
        </p>
      </div>
      <br />
      <h3>Imprint</h3>
      <h4>Karlsruhe Institute of Technology</h4>
      <h4>Leader of the research group</h4>
      <p>Prof. Stefan Bräse </p>
      <p>Institute of Organic Chemistry</p>
      <p>Fritz-Haber-Weg 6, Geb. 30.42</p>
      <p>76131 Karlsruhe </p>
      <p>Germany</p>
      <br />
      <p>Institute of Biological and Chemical Systems – Functional Molecular Systems (IBCS-FMS)</p>
      <p>Hermann-von-Helmholtz-Platz 1, Geb. 341</p>
      <p>76344 Eggenstein-Leopoldshafen</p>
      <p>Phone: +49 721 608 42903</p>
      <p>Fax: +49 721 608 48581</p>
      <br />
      <p />
      <a href="http://www.ioc.kit.edu/braese/" target="_blank" rel="noopener noreferrer">Homepage Prof. Bräse</a>
      <br />
      <h4>Office Campus North (KIT)</h4>
      <p>Dr. Nicole Jung, Dr. Pierre Tremouilhac</p>
      <p>Institute of Organic Chemistry</p>
      <p>Institute of Biological and Chemical Systems – Functional Molecular Systems</p>
      <p>Hermann-von-Helmholtz-Platz 1</p>
      <p>76344 Eggenstein-Leopoldshafen </p>
      <p>Germany</p>
      <p>Phone: +49 721 608 24697 </p>
      <br />
      <h4>Authors</h4>
      <p>Prof. Stefan Braese</p>
      <p>Dr. Nicole Jung, Dr. Pierre Tremouilhac</p>
      <br />
      <h3>Copyright Notices</h3>
      <div style={{ textAlign: 'justify' }}>
        <p>
          During the submission process, the submitter of a publication can choose,
          between several CC licenses, which license to apply to the submitted work.
          As the result, the content of this repository database
          (including the submitted publication files) is partly licensed under:
        </p>
        <ul>
          <li>
            <a rel="license noreferrer noopener" target="_blank" href="https://creativecommons.org/licenses/by-sa/4.0/">
              <img src="/images/creative_common/cc-by-sa.svg" alt="cc-by-sa-4" style={{ borderWidth: 0, height: '31px', width: '88px' }} />
            </a> Creative Commons Attribution-ShareAlike 4.0 International License (default),
          </li>
          <li>
            <a rel="license noreferrer noopener" target="_blank" href="https://creativecommons.org/licenses/by/4.0/">
              <img src="/images/creative_common/cc-by.svg" alt="cc-by-4" style={{ borderWidth: 0, height: '31px', width: '88px' }} />
            </a> Creative Commons Attribution 4.0 International License, and
          </li>
          <li>
            <a rel="license noreferrer noopener" target="_blank" href="https://creativecommons.org/publicdomain/zero/1.0/">
              <img src="/images/creative_common/cc-zero.svg" alt="cc-zero" style={{ borderWidth: 0, height: '31px', width: '88px' }} />
            </a> Creative Commons Universal License
          </li>
        </ul>
        <p>
          The source code of the chemotion REPOSITORY web server and client is currently licensed under the <a rel="license" href="https://github.com/ComPlat/chemotion_REPO/blob/chemotion_REPO/LICENSE" > GNU Affero General Public License v3.0</a>.
          The code can be found on <a href="https://github.com/complat/chemotion_REPO" target="_blank" rel="noopener noreferrer">github</a>.
        </p>
        <p>DOI®, DOI.ORG®, and shortDOI® are trademarks of the International DOI Foundation.</p>
        <br />
      </div>

      <h3>Content</h3>
      <div style={{ textAlign: 'justify' }} >
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

export default RepoAbout;
