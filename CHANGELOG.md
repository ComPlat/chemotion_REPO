# Chemotion_Repository Changelog

## [3.0.0]
> 2026-07-13

* Features and Enhancements:
  * Introduced a faceted search for `Data Publications`, filtering results by author, contributor, ontology, licence, publication year and element type, and reporting how many entries each filter matches.
  * Rebuilt the `Molecule Archive` around the same faceted sidebar, so compounds and publications are browsed in the same way.
  * Backed both searches with materialized views, so results and facet counts are served from a precomputed snapshot instead of being recalculated on every query.
  * Marked publications that have an X-Vial sample with a badge directly in the search results.
  * Excluded scheme-only reactions from the `Reaction` filter, so the count reflects reactions that carry data.
  * Rewrote the welcome page, with a structure carousel, publication insights, publication statistics per year, a new login menu and a `Home` button in the navigation bar.
  * Added `Quick Entry` to the welcome page, so a sample, its analyses and its publication details can be submitted in a single dialog without opening the ELN.
  * Extended `Quick Entry` with a full reaction editor, `ChemDraw` file upload and a reordered final step.
  * Stated in `Quick Entry` that the submitter is always listed as the first author of a submission, with co-authors added after.
  * Turned the tabs of the `Publications` page into a collapsible side menu.
  * Allowed contributors and reviewers to add literature references on the publication, review and embargo pages, and included the reference details in the Chemotion `ZIP` export and in the reaction report.
  * Added a QR code linking to the published page on the Repository detail pages.
  * Added a contributor filter and scrollbars to the embargo overview.
  * Displayed dataset metadata on the review and publish pages.
  * Refreshed the reviewer action buttons directly after an action, so the review state no longer needs a manual page reload.
  * Provided an `SDF` export of published compounds for the `ChemSpider` integration.
  * Aligned the sample and reaction `JSON-LD` with the current Bioschemas profiles for `ChemicalSubstance` and `MolecularEntity`.
  * Enabled click-to-zoom on the reaction list of a publication, and added a page-size selector next to the pagination.

* Bug Fixes:
  * Fixed publication attachments and author labels not being available to visitors who were not logged in.
  * Fixed the structure drawing tool not opening on the publication page.
  * Fixed the affiliation numbering of authors.
  * Fixed submissions arriving without their attachments after a sample or reaction was sent for review.
  * Fixed a blank page when switching from `Edit` to `Order` mode in the `Analysis` tab.
  * Fixed the details scrollbar disappearing when the browser was resized.
  * Fixed an inline script being blocked by the Content Security Policy.
  * Fixed the spectra viewer failing when an analysis had no description.
  * Fixed the QR code overlapping the download buttons, and a preview image being rendered at too low a resolution.
  * Fixed the wording of the analysis information in the exported `DOCX` report.
  * Fixed the `Authors` modal layout and its saving behaviour.

* Chores:
  * Split the Repository models and the `RepoCommon` module out of the shared code, separating the Repository code from the ELN.
  * Updated `react-bootstrap` from 0.33.1 to 2.10.2.
  * Updated `chem-generic-ui-viewer` to 1.7.0.
  * Included the [Chemotion LabIMotion version 2.1.1](https://github.com/LabIMotion/labimotion/blob/main/CHANGELOG.md#211).
  * Included the [Chemotion LabIMotion version 2.1.0](https://github.com/LabIMotion/labimotion/blob/main/CHANGELOG.md#210).
  * Included the [Chemotion ELN version 3.1.2](https://github.com/ComPlat/chemotion_ELN/blob/v3.1.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 3.1.1](https://github.com/ComPlat/chemotion_ELN/blob/v3.1.1/CHANGELOG.md).
  * Included the [Chemotion ELN version 3.1.0](https://github.com/ComPlat/chemotion_ELN/blob/v3.1.0/CHANGELOG.md).
  * Included the [Chemotion ELN version 3.0.0](https://github.com/ComPlat/chemotion_ELN/blob/v3.0.0/CHANGELOG.md).


## [2.6.0]
> 2026-03-06

* Features and Enhancements:
  * Publication downloader now includes attachments.
  * Publication JSON downloads are sorted according to Generic Dataset settings.
  * Refactored publication page to decouple sample handling.
  * Data exchange integration with nmrXiv.
  * Updated reaction yield calculation logic for scheme-only reactions.
  * Added sample name and description to the publication page.
  * Added support for downloading publications in Chemotion ZIP format.
  * Added ability to revert accepted publications to pending status for reviewers.
  * Added support for submitting templates to the Template Hub.
  * Added speech-to-text functionality for reviewers.
  * Added VERSION information.
  * Upgraded Common API.
  * Added template direct link support.
  * Added preview functionality in the Template Hub.
  * Enhanced search bar on the review page.
  * Improved styling and usability of the Assign User Labels modal.

* Bug Fixes:
  * Fixed issue where the threshold could not be adjusted.
  * Fixed issue where embargo action buttons were covered.
  * Fixed versioning feature toggle to include resubmission.
  * Fixed `TypeError: cannot access property 'setState'`.

* Chores:
  * Library upgrades, security updates, and general maintenance.

## [2.5.0]
> 2025-08-06

* Features and Enhancements:
  * Enhanced search behavior on the Review and Data Publications pages for improved user experience.
  * Introduced the `Important Note` feature during the review process.
  * Introduced a new feature, `Fundings & Awards`, allowing scientists to provide funding details, including funder and award information.
  * Added display of application information.
  * Provided APIs for `Bagit` download by analysis type.
  * Implemented `RDF` support, including functionality for Turtle, N-Triples, TriG, and N-Quads formats, with viewer, download options, and public APIs.
  * Provided analysis description information on the `Data Publications` page.
  * Displayed submission status on the individual submission review page to improve reviewer usability.
  * Introduced a versioning feature with release toggles.
  * Improved comment functionality styling for better visibility and usability.

* Bug Fixes:
  * Fixed the issue where exact mass was displayed instead of theoretical mass.
  * Resolved layout issue with the analysis info modal positioning. [#147](https://github.com/ComPlat/chemotion_REPO/issues/147)
  * Resolved the issue where `e-Chemistry` information was not displaying properly on the Review page.
  * Resolved the issue causing a blank page in the spectra viewer when using comparison mode.
  * Fixed the issue preventing submitters from editing their work for resubmission.
  * Fixed the issue where the NMRium viewer went blank on the comparison page.
  * Corrected the routing logic for versioned publications.

* Chores:
  * Updated library dependencies.

## [2.4.0]
> 2025-05-23

* Features and Enhancements:
  * Enhanced `Group Lead` functionality:
    * Users can now configure their Group Lead in the Account & Profile page.
    * The system will automatically add the Group Lead as an Author by default (removable by the user).
    * The system will automatically assign the Group Lead as a Reviewer.
  * Improved the `Authors & Reviewers` function.
  * Enabled affiliation modification for Contributors during the review process.
  * Added reviewer labeling functionality.
  * Upgraded to `DataCite Metadata Schema 4.6`.
  * [Add ORCID iD via Account & Profile #79.](https://github.com/ComPlat/chemotion_REPO/issues/79)
  * [Change in the affiliations on the review and publication page #110.](https://github.com/ComPlat/chemotion_REPO/issues/110)
  * Integrated `ROR (Research Organization Registry)`. [#81](https://github.com/ComPlat/chemotion_REPO/issues/81)
  * Refactored the `My Collaborations` UI.
  * Provided export metadata to integrated with Chemotion Wiki.
  * Added **redox** entries to the Chemotion Wiki sheet.
  * Implemented Matomo toggle in/out.

* Bug Fixes:
  * Fixed issue where automated line breaks were not applied in the Comment to Reviewer function. [#144](https://github.com/ComPlat/chemotion_REPO/issues/144)
  * Fixed missing `NMR` button in the reaction analysis view.
  * Resolved CI collection issues.
  * Corrected missing solvent name in the publication view.
  * Fixed FTP connection issue.
  * Fixed blank page issue in NMRium viewer.

* Chores:
  * Updated library dependencies.
  * Updated `Imprint`, `Privacy` and `Directive` sections for the Chemotion Repository.
  * Updated repository lifetime information.
  * Upgraded node version.
  * Removed redundant code.

## [2.3.0]
> 2025-02-06

* Features and Enhancements:
  * Default lock zooming on the publication page.
  * Introduced a yield and conversion switch for the review and publication pages.
  * Added support for the ChemSpectra function with multiple molecules.
  * Fixed an issue where empty files were being downloaded.
  * Enabled the NMRium feature based on ontology selection.
  * Improved the QC check logic for mass spectra.
  * Added support for SURMOF change type.
  * Included the [Chemotion LabIMotion version 1.4.1](https://github.com/LabIMotion/labimotion/blob/main/CHANGELOG.md#141).
  * Included the [Chemotion LabIMotion version 1.4.0](https://github.com/LabIMotion/labimotion/blob/main/CHANGELOG.md#140).

* Bug Fixes:
  * Fixed an issue with adding collaboration via ORCID iD.
  * Fixed missing molarity values during data transfer from ELN.
  * Fixed an issue with advanced search.
  * Fixed NMRium view issues on the review page.
  * Fixed user view presentation for generic datasets.

* Chores:
  * Improved performance with preload.
  * Changed 'x-vial' to 'sample' on the publication page
  * Upgraded react-molviewer
  * Upgraded chem-generic-ui-viewer
  * Upgrade ag-grid-react
  * Upgrade node version
  * Removed redundant code.
  * Included the [Chemotion ELN version 1.10.5](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.4](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.3](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.2](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.1](https://github.com/ComPlat/chemotion_ELN/blob/v1.10.1/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.0](https://github.com/ComPlat/chemotion_ELN/blob/v1.10.0/CHANGELOG.md).


## [2.2.0]
> 2024-11-06

* Features and Enhancements:
  * Adjusted the button layout for preview images on the publication page.
  * Expanded coverage of Ontology Terminology in metadata.
  * Reduced paragraph spacing in the quill-viewer for space efficiency.
  * Added ontology terminology to JSON-LD metadata based on template definitions.
  * Introduced the StartingMaterial4Chem identifier to the publication list.
  * A submission feature with dataset copy capability.
  * Decoupled sample information in the Publication and Review pages, enhancing data clarity and management.
  * Updated Schema.org JSON-LD metadata to enhance data interoperability and search engine optimization.
  * Added functionality to add or remove reviewers during the review process.
  * Enabled NMRium functionality on the Data Publications page.
  * Enhanced preview capabilities for anonymous users.
  * Added additional information settings for StartingMaterial4Chem.
  * Refined JSON-LD metadata to further improve data interoperability and search engine optimization.
  * Added advertisement for the NFDI4Chem award.
  * Added StartingMaterial4Chem support for Buchler and Carbolution.
  * Included the [Chemotion LabIMotion version 1.3.0](https://github.com/LabIMotion/labimotion/blob/main/CHANGELOG.md#130).

* Bug Fixes:
  * Fixed an issue where clicking on embargo review.
  * Fixed issue with uploading attachments.
  * Fixed conversion failure while fetching thumbnails.
  * Resolved blank page issue when clicking "Keep Changes" on the submit modal.
  * Fixed issue where reviewers could not add an author.
  * Corrected incorrect affiliation ID format.
  * Fixed issue where submission failed when no review information was provided.
  * Fixed an issue where the sample name was missing on the review page.
  * Fixed an issue where importing collections failed when multiple collections were provided.

* Chores:
  * Improved performance with preload.
  * Upgraded react-molviewer
  * Upgraded chem-generic-ui-viewer
  * Upgraded Quill for the quill-viewer function.
  * Removed redundant code.
  * Included the [Chemotion ELN version 1.9.2](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.9.1](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.1/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.9.0](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.0/CHANGELOG.md).

## [2.1.15]
> 2024-10-15
* **Bug Fixes:**
  * Fixed issue where the suggestion list was empty due to a type error from the cell line.
  * Fixed issue where data without xvial should not be listed on the `Molecule Archive` page.
  * Fixed layout issue where columns with "hasOwnLine" enabled impacted arrangement.

* **Chores:**
  * Aligned button sizes after library upgrade.
  * Upgraded chem-generic-ui.
  * Upgraded chem-generic-ui-viewer.

## [2.1.14]
> 2024-10-09
* **Bug Fixes:**
  * Fixed the issue that readonly text should be displayed on publications.

## [2.1.13]
> 2024-09-29
* **Bug Fixes:**
  * Fixed the problem that rf value 0 is shown as empty on the publication page.

## [2.1.12]
> 2024-09-28
* **Chores:**
  * Upgraded chem-generic-ui-viewer

## [2.1.11]
> 2024-09-18
* **Features and Enhancements:**
  * Advertisement nfdi4chem award

* **Bug Fixes:**
  * Fixed an issue where clicking on embargo review.

* **Chores:**
  * Upgraded chem-generic-ui-viewer
  * Upgraded react-molviewer

## [2.1.10]
> 2024-08-26
* **Features and Enhancements:**
  * Adjusted the layout of buttons for preview images on the publication page.
  * Expanded Ontology Terminology coverage for metadata.
  * Removed paragraph spacing in the quill-viewer to save space.

* **Bug Fixes:**
  * Fixed an issue where importing collections failed when multiple collections were provided.

* **Chores:**
  * Removed redundant code.

## [2.1.9]
> 2024-08-12
* **Features and Enhancements:**
  * Added ontology terminology to JSON-LD metadata based on the template definition.
  * Introduced the StartingMaterial4Chem identifier to the publication list.

* **Bug Fixes:**
  * Fixed an issue where the sample name was missing on the review page.

* **Chores:**
  * Upgraded Quill for the quill-viewer function.

## [2.1.8]
> 2024-07-31
* **Features and Enhancements:**
  * Enhanced preview functionality for anonymous user.
  * Added additional information setting for StartingMaterial4Chem.
  * Polished JSON-LD metadata for enhanced data interoperability and search engine optimization.

* **Bug Fixes:**
  * Fixed issue where submission failed when no review information was provided.

> 2024-07-30
* **Features and Enhancements:**
  * NMRium function is available on the Data Publications page.
  * StartingMaterial4Chem - Buchler.
  * StartingMaterial4Chem - Carbolution.

* **Bug Fixes:**
  * Fixed issue with uploading attachments.
  * Fixed conversion failure while fetching thumbnails.
  * Resolved blank page issue when clicking "Keep Changes" on the submit modal.
  * Fixed issue where reviewers could not add an author.
  * Corrected incorrect affiliation ID format.

* **Chores:**
  * Improved performance with preload.
  * Removed redundant code.

> 2024-07-22
* **Features and Enhancements:**
  * A submission feature with dataset copy capability.
  * Decoupled sample information in the Publication and Review pages, enhancing data clarity and management.
  * Updated Schema.org JSON-LD metadata for improved data interoperability and search engine optimization.

## [2.1.7]
> 2024-07-03
* Features and enhancements:
  * A feature to add or remove additional reviewers during the reviewing process.

## [2.0.8]
> 2024-04-29
* Features and enhancements:
  * LabIMotion 1.3.0
* Chores:
  * Optimized fetch structure operation to improve performance.
  * Adjusted layout for datetime range.
  * Refactored the code structure for easier maintenance.
  * Changed 'x-vial' to 'sample' on the publication page.
  * Upgraded react-molviewer.
  * Upgraded chem-generic-ui-viewer.
  * Upgrade ag-grid-react.
  * Upgrade Node.js version.
  * Removed redundant code.
  * Included the [Chemotion LabIMotion 1.4.1](https://github.com/LabIMotion/labimotion/blob/main/CHANGELOG.md#141).
  * Included the [Chemotion LabIMotion 1.4.0](https://github.com/LabIMotion/labimotion/blob/main/CHANGELOG.md#140).
  * Included the [Chemotion ELN version 1.10.5](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.4](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.3](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.2](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.1](https://github.com/ComPlat/chemotion_ELN/blob/v1.10.1/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.10.0](https://github.com/ComPlat/chemotion_ELN/blob/v1.10.0/CHANGELOG.md).


## [2.2.0]
> 2024-11-06

* Features and Enhancements:
  * Adjusted the button layout for preview images on the publication page.
  * Expanded coverage of Ontology Terminology in metadata.
  * Reduced paragraph spacing in the quill-viewer for space efficiency.
  * Added ontology terminology to JSON-LD metadata based on template definitions.
  * Introduced the StartingMaterial4Chem identifier to the publication list.
  * A submission feature with dataset copy capability.
  * Decoupled sample information in the Publication and Review pages, enhancing data clarity and management.
  * Updated Schema.org JSON-LD metadata to enhance data interoperability and search engine optimization.
  * Added functionality to add or remove reviewers during the review process.
  * Enabled NMRium functionality on the Data Publications page.
  * Enhanced preview capabilities for anonymous users.
  * Added additional information settings for StartingMaterial4Chem.
  * Refined JSON-LD metadata to further improve data interoperability and search engine optimization.
  * Added advertisement for the NFDI4Chem award.
  * Added StartingMaterial4Chem support for Buchler and Carbolution.
  * Included the [Chemotion LabIMotion version 1.3.0](https://github.com/LabIMotion/labimotion/blob/main/CHANGELOG.md#130).

* Bug Fixes:
  * Fixed an issue where clicking on embargo review.
  * Fixed issue with uploading attachments.
  * Fixed conversion failure while fetching thumbnails.
  * Resolved blank page issue when clicking "Keep Changes" on the submit modal.
  * Fixed issue where reviewers could not add an author.
  * Corrected incorrect affiliation ID format.
  * Fixed issue where submission failed when no review information was provided.
  * Fixed an issue where the sample name was missing on the review page.
  * Fixed an issue where importing collections failed when multiple collections were provided.

* Chores:
  * Improved performance with preload.
  * Upgraded react-molviewer
  * Upgraded chem-generic-ui-viewer
  * Upgraded Quill for the quill-viewer function.
  * Removed redundant code.
  * Included the [Chemotion ELN version 1.9.2](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.2/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.9.1](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.1/CHANGELOG.md).
  * Included the [Chemotion ELN version 1.9.0](https://github.com/ComPlat/chemotion_ELN/blob/v1.9.0/CHANGELOG.md).


## [2.1.0]
> 2024-08-05

* Bug fixes:
  * Fixed svg scrubber


## [2.0.6]
> 2024-04-18

* Features and enhancements:
  * Implemented streaming data transfer from Chemotion ELN

* Bug fixes:
  * fixed downloading files via the pop-up modal fails on the publication page  (ComPlat/chemotion_REPO#96)
  * Disabled annotate button for the publication
  * Fixed initial load hang issue
* Chores:
  * chore: remove duplicate codes

## [2.0.5]
> 2024-04-09

* Features and enhancements:
  * Introduced the embargo overview page, which enables scientists to review their submission status and providing an overview for the reviewers
  * Implemented the review comment function for the embargo collection

* Bug fixes:
  * Fixed the incorrect format of the sign-up terms and conditions content (ComPlat/chemotion_REPO#83)
  * Fixed a flaw in the similarity search function that caused the error (ComPlat/chemotion_REPO#91)

## [2.0.4]
> 2024-03-12

* Features and enhancements:
  * Introduced a new confirmation and welcome email. (ComPlat/chemotion_REPO#74)
* Chores:
  * Updated API document. (ComPlat/chemotion_REPO#67)

## [2.0.3]
> 2024-03-08

* Bug fixes:
  * Fixed the missing warning dialog before canceling an account. (ComPlat/chemotion_REPO#78)

## [2.0.2]
> 2024-02-26

* Features and enhancements:
  * Introduced preservation strategy for the Chemotion Repository.
  * Use public domain icon to represent `No License`.
  * Use `ORCID iD` to refer to the ORCID identifier.
  * Group analysis attachments.
  * Introduced spectra viewer on the publication page without login required.
  * Introduced the embargo overview page, which enables scientists to review their submission status and providing an overview for the reviewers.
  * Implemented the review comment function for the embargo collection.
  * Enhanced the publication page performance by using cache mechanism.
  * Implemented streaming data transfer from Chemotion ELN.
  * Introduced a new confirmation and welcome email. [[Chemotion_Repository#74](https://github.com/ComPlat/chemotion_REPO/issues/74)].
  * Introduced preservation strategy for the Chemotion Repository.
  * LabIMotion 1.1.4.

* Bug Fixes:
  * Fixed svg scrubber.
  * Fixed the missing confirmation dialog when canceling an account.
  * Fixed the missing DOI information in the SI.
  * Fixed the publication page shows no entries.
  * Fixed downloading files via the pop-up modal fails on the publication page. [[Chemotion_Repository#96](https://github.com/ComPlat/chemotion_REPO/issues/96)].
  * Disabled annotate button for the publication.
  * Fixed initial load hang issue.
  * Fixed the incorrect format of the sign-up terms and conditions content [[Chemotion_Repository#83](https://github.com/ComPlat/chemotion_REPO/issues/83)].
  * Fixed a flaw in the similarity search function that caused the error. [[Chemotion_Repository#91](https://github.com/ComPlat/chemotion_REPO/issues/91)].
  * Fixed the missing warning dialog before canceling an account. [[Chemotion_Repository#78](https://github.com/ComPlat/chemotion_REPO/issues/78)].

* Chores:
  * Updated API document.
  * Reorganize partners section on homepage.
  * Disabled DOI List.
  * Upgraded Labimotion.
  * chore: remove duplicate codes.
  * Updated API document. [[Chemotion_Repository#67](https://github.com/ComPlat/chemotion_REPO/issues/67)].
  * Upgraded lodash from 4.17.20 to 4.17.21.
  * Upgraded puma from 5.6.7 to 5.6.8.
  * Upgraded follow-redirects from 1.14.9 to 1.15.5.
  * Upgraded ruby from 2.7.7 to 2.7.8.
  * Upgraded node from 18.18.2 to 18.19.1.


## [2.0.0]
> 2024-01-15

* Features and enhancements:
  * `Dataset Excel` improvement: More information is provided in the `Description` sheet. See the documentation [here](https://www.chemotion.net/docs/labimotion/guides/user/datasets/download).
  * Inbox Converter: The device files are converted automatically when they arrive in the inbox.
  * Introduced `Repo Search Tool`: A search tool is now accessible on the Chemotion Repository Home page. This tool enables searches by author, chemical methods ontology, IUPAC, InChi, SMILES, or even allows users to draw a structure for searching in Data Publications or Molecule Archive.
  * Enhanced JSON-LD Option: An additional option has been incorporated into JSON-LD, allowing users to view all samples of the published reaction.
  * JSON-LD Format Support: Data Publications now support the JSON-LD format. We are continually refining this function to align more closely with schema.org standards.
  * Introduced Review Guidelines and Reviewers' Introduction Section: We have added a dedicated section to clearly outline the review guidelines and provide an introduction for reviewers.
  * LabIMotion Hub UI Optimization: We have optimized the LabIMotion Hub UI to improve user experience.
  * Implemented `Lock` mechanism: The original sample or reaction is automatically locked upon submission. Submitters have the option to unlock it for further editing.
  * Enhanced the front-end code to eliminate the 'unique key of child' warning.
  * Introduced Generic Dataset section in Publication Page: Generic datasets are now displayed on the publication page, enhancing the overall user experience. Example link: [Reaction DOI](https://dx.doi.org/10.14272/reaction/SA-FUHFF-UHFFFADPSC-DBLYDXDFRQ-UHFFFADPSC-NUHFF-FFHMS-NUHFF-ZZZ.21).
  * Introduced Generic Dataset in Review Page: Similarly, Generic Datasets are visible on the review page, providing comprehensive information to reviewers.
  * Refactored Submission Data Check Modal: The submission data check modal has been refactored for better user experience.
  * Always Create a New Record for Review Comments: A new record is now created for each review comment. This feature is applicable for actions taken after deployment.
  * Introduced Converter Feature for Inbox Data: A converter feature has been added to facilitate easy conversion of inbox data, streamlining data processing tasks.
  * Made Temperature, Duration, and Description Optional for Submission: Users now have the flexibility to submit data without providing temperature, duration, and description, simplifying the submission process.
  * Re-packed the MolViewer to deal with cif file.
  * Invisibility of Temperature, Duration, and Description on Publication Page: If no data is available, temperature, duration, and description fields are now invisible on the publication page, providing a cleaner and more concise presentation.
  * Introduced `Review Comment Ownership` feature: User can now create review comments to maintain ownership and clarity.
  * Enhanced Review Comments: Added the capability to attach review comments to the physical properties of the sample.
  * Improved User Comment Modal: The User Comment Modal can now be dragged and ensures the background remains visible.
  * Automatic Closure of Review Modal: The Review Modal now closes automatically when the user closes the element on the review page.
  * Improved the Submission Check view: The Submission Check view has been enhanced to provide a better user experience.
  * Introduced `Download Metadata and Data`: Users have the ability to acquire metadata in xlsx format(`Dataset Excel`). Furthermore, an option is provided for users to download both the data and metadata together as a compressed zip file.
  * Implemented a feature for global user labeling: Authorized users can now define a global label that is accessible to all users.
  * Introduced `LabIMotion Template Hub`: The LabIMotion Template Hub is now available for users to access and download templates. See [here](https://www.chemotion-repository.net/home/genericHub) for more information.
  * Added `license` to the linked data.
  * Added X-Vial to the Publication Page.
  * Introduced `MolViewer`: Users can now use the button `Viewer` to view molecules structure in the MolViewer.
  * Added `.tool-versions` file to the repository.

* Bug fixes:
  * Resolved a bug causing an invalid date format in certain cases.
  * Addressed an issue where reviewers encountered an empty embargo list.
  * Fixed a bug where scientists organizing report content experienced page breaks.
  * Corrected Navigation URLs: Navigation URLs have been reviewed and corrected to prevent incorrect redirects, ensuring seamless browsing for users.
  * Fixed Issue with Missing File Extensions: An issue occurring when filenames lacked file extensions has been resolved. Files are now handled correctly regardless of the presence of an extension.
  * Text Copying Issue Resolved: The problem with copying text in the User Comment Modal has been fixed.
  * Fixed the issue where the unit data cannot be displayed in the publication page.
  * Addressed an issue where terminology data was not retained following import.
  * Resolved an issue where users were unable to utilize the 'Compare View' feature to assess the disparities between the submitted data and the current working version.
  * Fixed the issue that different molecule shows the same structure in the MolViewer.
  * Corrected dataCatalog syntax error.

* Chores:
  * Upgraded ChemSpectra.
  * Upgraded Converter.
  * Upgraded Labimotion.
  * Upgraded NMRium.
  * Upgraded node version.
  * Upgraded Ruby version.
  * Included the [Chemotion ELN version 1.8.1](https://github.com/ComPlat/chemotion_ELN/blob/v1.8.1/CHANGELOG.md).


## [1.2.0]
> 2023-06-29


* Enhancements:

  * published on ISO8601. ComPlat/chemotion_REPO#46
  * Add physical properties which are melting point and boiling point information to the publication page and review page.
  * Introduction of the data protection mechanism where the system automatically locks data after scientists submit their work; they can unseal the data for editing.
  * publish sample: pre-chosen license. ComPlat/chemotion_REPO#27
  * Introduction of the feature that users can see the information from the original one after transferring the data from ELN and click on it to redirect to the ELN instance.
  * Upgrade node version.

## [1.1.0]
> 2023-06-12

* Enhancements:

  * Integration of Molecule Archive to enhance data visibility and management capabilities.
  * Support for assigning Collection DOIs, enabling persistent identification of collections.
  * Shibboleth support for streamlined authentication and authorization processes.
  * JSON-LD format support for enriched metadata representation.
  * Open API for convenient downloading of metadata in JSON-LD format.
  * Addition of group leader review functionality, facilitating improved collaboration and oversight.
  * Support for publishing MOF reactions.
  * Introduction of the Converter service, enabling format conversion for data.
  * Introduction of the Ketcher backend service.
  * Enriched metadata support for various types of published samples.
  * Redesigned sample representation on the landing page for improved usability.
  * Support for ORCID authentication, providing seamless user identification.
  * Upgraded Chemspectra function.
  * Styling improvements to enhance the user experience.

* Bug Fixes:

  * Addressed an issue with the exporting function when data includes hyperlinks.
  * Resolved a QC issue related to the usage of 'mass spectrometry' and 'IR'.
  * Corrected the nmrium aasm_state to ensure accurate representation.
  * Fixed an issue where the embargo job would get stuck if the mail server did not respond.

* Fixes
  * npx-audit and Gem patches
  * migration
  * reaction prediction UI
