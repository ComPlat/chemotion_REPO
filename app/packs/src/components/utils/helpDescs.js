import React from 'react';

const REQUIRED_TIP = (
  <span>This field is required for publication</span>
);

const CONTRIBUTOR_TIP = (
  <span>
    Contributions to the database can be made by anyone. The contributor should give an information
    on the original publication if the reaction was retrieved or extracted from a foreign work.
  </span>
);

const SCHEME_TIP = (
  <ul className="tooltip_list">
    <li>
      Add the correct chemical name of the used or obtained compounds if the name is not
      generated automatically
    </li>
    <li>
      If you use a reagent in solution, add this information to the sample: click on
      the name of the reagent -&gt; add information (solvent, molarity etc.) in the panel for
      the sample -&gt; save changes
    </li>
    <li>
      In the same way you can also add information on the density of used reagents or the obtained
      melting point/boiling point of your products
    </li>
  </ul>
);

const DESCRIPTION_TIP = (
  <span className="tooltip_list_paragraph">
    <ul>
      <li>
        Add here a complete description for the given reaction in a clear and structured
        way with all relevant information that helps other scientists to reproduce the experiment
      </li>
      <li>
        Define all details as well as possible, e.g. avoid expressions such as
        &quot;room temperature&quot; or &quot;over night/over the weekend&quot; rather
        give the correct temperature and time
      </li>
      <li>
        The description should contain the full names and amount of all chemicals that
        were used or obtained, please don&apos;t give general descriptions
      </li>
      <li>
        Check the consistency of the given amounts and values with the reaction table again
      </li>
      <li>
        The description field contains information on the reaction itself including the workup but
        without the measures to purify the compounds by chromatography or other methods.
        as such information should be placed in &quot;additional information for publication and
        purification details&quot;
      </li>
      <li>
        If you describe a reaction that refers to two steps (e.g. intermediate was not purified and
        used directly for the next step) then add information on the obtained intermediate
        (chemical name, if possible obtained amount of the crude product)
      </li>
    </ul>
    <p>
       Hint: the information on the name and amount of the chemicals can be added to a defined
       position in the text by click on the blue button labelled with &quot;A,B, ... P1, P2&quot;
    </p>
  </span>
);

const ADDITIONAL_INFO_TIP = (
  <ul className="tooltip_list">
    <li>
      Add here the information on the purification of your crude product(s) including the
      information on the obtained product(s) (name, amount, yield, color, physical condition)
    </li>
    <li>Add the type of purification and all necessary details to reproduce the process</li>
    <li>
      The Rf-value of the product(s) can be entered on the &quot;properties&quot; page
    </li>
  </ul>
);

const helpDescs = Object.freeze({
  requiredField: REQUIRED_TIP,
  contributor: CONTRIBUTOR_TIP,
  description: DESCRIPTION_TIP,
  scheme: SCHEME_TIP,
  additionalInformation: ADDITIONAL_INFO_TIP
});

export default helpDescs;
