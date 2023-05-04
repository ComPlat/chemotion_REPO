import React from 'react';
import PropTypes from 'prop-types';

const LicenseIcon = (props) => {
  const { doi, license, hasCoAuthors = false } = props;
  const anc = doi.split('/').pop();
  const presentStyle = { height: '26px' };
  let presentHref = 'http://creativecommons.org/licenses/by-sa/4.0/';
  let presentAlt = 'This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.';
  let presentPath = '/images/creative_common/cc-by-sa.svg';
  const cc0Alt = [
    'To the extent possible under law, the',
    (hasCoAuthors ? 'persons' : 'person'),
    'who associated CC0 with this work',
    (hasCoAuthors ? 'have' : 'has'),
    'waived all copyright and related or neighboring rights to this work.'
  ].join(' ');

  switch (license) {
    case 'CC BY-SA':
      presentHref = 'http://creativecommons.org/licenses/by-sa/4.0/';
      presentAlt = 'This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.';
      presentPath = '/images/creative_common/cc-by-sa.svg';
      break;
    case 'CC BY':
      presentHref = 'http://creativecommons.org/licenses/by/4.0/';
      presentAlt = 'This work is licensed under a Creative Commons Attribution 4.0 International License.';
      presentPath = '/images/creative_common/cc-by.svg';
      break;
    case 'CC0':
      presentHref = 'http://creativecommons.org/publicdomain/zero/1.0/';
      presentAlt = cc0Alt;
      presentPath = '/images/creative_common/cc-zero.svg';
      break;
    case 'No License':
      presentHref = '';
      presentAlt = 'No License';
      presentPath = '';
      break;
    default:
      break;
  }
  return presentHref === '' ? null : <a className="repo-public-user-comment" name={anc} id={anc} rel="noreferrer noopener" target="_blank" href={presentHref}><img src={presentPath} style={presentStyle} alt={presentAlt} title={presentAlt} /></a>;
};

LicenseIcon.propTypes = {
  doi: PropTypes.string, hasCoAuthors: PropTypes.bool, license: PropTypes.string
};

LicenseIcon.defaultProps = { doi: '', hasCoAuthors: false, license: '' };

export default LicenseIcon;
