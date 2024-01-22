import Rails from '@rails/ujs';

Rails.start();

// see https://github.com/rackt/react-router/issues/1067

var React = require('react');
var Home = require('src/apps/home/Home');
var CnC = require('src/apps/commandAndControl');
var AdminHome = require('src/apps/admin');
var ChemScanner = require('src/apps/chemscanner/');
var ChemSpectra = require('src/apps/chemspectra/ChemSpectra');
var ChemSpectraEditor = require('src/apps/chemspectra/ChemSpectraEditor');
var MoleculeModerator = require('src/apps/moleculeModerator');
var OmniauthCredential = require('src/apps/omniauthCredential');
var UserCounter = require('src/apps/userCounter');
var ScifinderCredential = require('src/apps/scifinderCredential');
var StructureEditorUserSetting = require('src/components/structureEditor/UserSetting');
var LoginOptions = require('src/apps/omniauthCredential/LoginOptions');
var ConverterAdmin = require('src/apps/converter/ConverterAdmin');
var GenericElementsAdmin = require('src/apps/generic/GenericElementsAdmin');
var GenericSegmentsAdmin = require('src/apps/generic/GenericSegmentsAdmin');
var GenericDatasetsAdmin = require('src/apps/generic/GenericDatasetsAdmin');
var mydb = require('src/apps/mydb');

// Fro REPO
var RepoNewsEditor = require('src/repoHome/RepoNewsEditor');
var RepoNewsReader = require('src/repoHome/RepoNewsReader');
var RepoHowToEditor = require('src/repoHome/RepoHowToEditor');
var RepoHowToReader = require('src/repoHome/RepoHowToReader');

