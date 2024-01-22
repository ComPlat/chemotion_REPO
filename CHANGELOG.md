# Chemotion_Repository Changelog

## [2.1.0]
> 2024-08-05

* Features and Enhancements:
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
