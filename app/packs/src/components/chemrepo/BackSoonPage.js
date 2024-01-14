import React from 'react';
import ContactEmail from 'src/components/chemrepo/core/ContactEmail';

function BackSoonPage() {
  return (
    <div>
      <h1>{`We'll be back soon!`}</h1>
      <h3>
        <i className="fa fa-cog fa-spin fa-5x" />
      </h3>
      <h3>
        {`Apologies for the inconvenience as we're currently undergoing maintenance.`}
      </h3>
      <h3>
        If you need assistance, please feel free to <ContactEmail />
        {`. Otherwise, we'll be back online shortly!`}
      </h3>
      <h4>&mdash; ComPlat Team</h4>
    </div>
  );
}

export default BackSoonPage;
