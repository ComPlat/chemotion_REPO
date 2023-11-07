import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Col, Row } from 'react-bootstrap';
import uuid from 'uuid';
import ContactEmail from 'src/components/chemrepo/core/ContactEmail';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';

const ReviewerCard = ({
  name, photo, tel, email
}) => (
  <div className="card-reviewers">
    <img src={`/images/reviewers/${photo}?random=${uuid.v4()}`} alt={photo} />
    <h4>{name}</h4>
    <p>Tel.: {tel}</p>
    <ContactEmail email={email} label={name} />
    <br /><br /><br /><br />
  </div>
);

ReviewerCard.propTypes = {
  name: PropTypes.string.isRequired,
  photo: PropTypes.string.isRequired,
  tel: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
};

export const ReviewGuidelines = () => (
  <Row>
    <Col md={12} sm={12}>
      <div className="card-reviewers">
        <h3>Chemotion Repository Review Guidelines</h3>
        <p className="description">
          The Chemotion Repository is a curated repository. The submitted entries are curated with respect to formal aspects and feedback is given referring to possible questions or errors. This effort is done to ensure a high quality of the submitted data and to provide data according to community standards. The most important formatting requirements and other hints that can help users to pass the curation easily are described in detail in the documentation, e.g. here (and following pages): <a href="https://chemotion.net/docs/repo/details_standards" target="_blank" rel="noreferrer">Chemotion Repository &gt; Details and Standards</a>
        </p>
        <p className="description">
          The reviewers involved in the curation are volunteers that support the idea of collecting open data. They do their best to guide and support users. All reviewers confirmed to work according to ethical standards. This means in detail that reviewers declare that they will thoroughly review all submissions for publication to the best of their knowledge and ability. They pledge to treat all content confidentially and to not disclose any information, whether personal or factual, to third parties during the review process. They will assess all submissions neutrally, impartially, and by the same criteria. If a conflict of interest arises, they will decline the review of the submission and transfer it to another reviewer for evaluation.
        </p>
        <p className="description">
          Please don&#39;t hesitate to contact the reviewers assigned to your submissions if there are any questions. Please use the option to answer per feedback note, we are glad for all comments and explanations.
        </p>
      </div>
    </Col>
  </Row>
);

const RepoCardReviewers = () => {
  const [data, setData] = useState([]);
  useEffect(() => {
    PublicFetcher.reviewers().then((json) => {
      setData(json);
    }).catch(err => console.log('error while loading reviewers, message =', err));
  }, []);

  if (data.length < 1) return null;

  const cards = data.map(item =>
    (<Col key={item.id} lg={3} md={6} sm={12}><ReviewerCard {...item} /></Col>));

  return (
    <>
      <Row>
        <Col md={12} sm={12}><div className="home-title"><span>The Reviewers</span></div></Col>
      </Row>
      <Row>
        <Col md={0} sm={12}>&nbsp;</Col>
        <Col md={12} sm={12}>{cards}</Col>
        <Col md={0} sm={12}>&nbsp;</Col>
      </Row>
    </>
  );
};

export const RepoCardReviewerIntro = () => (
  <Row className="reviewers-intro">
    <Col lg={12} md={12} sm={12}>
      <ReviewGuidelines />
      <RepoCardReviewers />
    </Col>
  </Row>
);

export const RepoCardReviewerIntroBtn = (props) => {
  const { onClick, show } = props;
  return (
    <Button style={{ backgroundColor: '#efefef', color: 'black', flex: 'auto' }} bsSize="small" onClick={onClick}>
      Chemotion Repository Review Guidelines<br />
      <i style={{ color: 'black' }} className={`fa fa-caret-${show ? 'up' : 'down'}`} aria-hidden="true" />
    </Button>);
};

RepoCardReviewerIntroBtn.propTypes = {
  onClick: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
};
