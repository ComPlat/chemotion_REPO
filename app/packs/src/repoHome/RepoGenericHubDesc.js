import React from 'react';
import { Button } from 'react-bootstrap';
import ContactEmail from 'src/components/chemrepo/core/ContactEmail';

function RepoGenericHubDesc() {
  return (
    <div className="repo-generic-hub-desc">
      <h1>
        LabIMotion Template Hub
        <span className="contact">
          <ContactEmail
            email="chemotion-labimotion@lists.kit.edu"
            label="Send feedback about LabIMotion"
          />
        </span>
        <span className="contact">
          <Button
            bsSize="small"
            onClick={() => {
              window.open(
                'https://www.chemotion.net/docs/labimotion',
                '_blank'
              );
            }}
          >
            <i className="fa fa-book" aria-hidden="true" />
            &nbsp;LabIMotion Docs
          </Button>
        </span>
      </h1>
      <h3>
        Welcome to the <b>LabIMotion Template Hub</b>, your platform for sharing
        new elements, segments, and datasets templates.
      </h3>
      <br />
      <h3>Getting Started: Selecting a Template</h3>
      <p>
        The templates are conveniently displayed in a grid layout. You can:{' '}
      </p>
      <h5>
        <p>
          <i className="fa fa-check" aria-hidden="true" />
          &nbsp;<b>Sort</b> the grid by clicking on the column headers.{' '}
        </p>
        <p>
          <i className="fa fa-check" aria-hidden="true" />
          &nbsp;<b>Filter</b> the grid by clicking on the filter icon{' '}
          <span className="download">
            <i className="fa fa-bars" aria-hidden="true" />
          </span>{' '}
          located at the right of the column headers.{' '}
        </p>
        <p>
          <i className="fa fa-check" aria-hidden="true" />
          &nbsp;<b>Download</b> a specific template by clicking on the button{' '}
          <span className="download">
            <i className="fa fa-download" aria-hidden="true" />
            &nbsp;Download
          </span>
          .{' '}
        </p>
      </h5>
      <h3>
        Now, let&apos;s get started. Choose the template you need and begin the
        download process.
      </h3>
    </div>
  );
}

export default RepoGenericHubDesc;
