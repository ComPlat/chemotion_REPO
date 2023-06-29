
# Chemotion_Repository Changelog


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
