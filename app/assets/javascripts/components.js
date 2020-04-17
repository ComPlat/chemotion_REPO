// see https://github.com/rackt/react-router/issues/1067

var React = require('react');
var Home = require('./libHome/Home');
var CnC = require('./libCnC/CnC');
var AdminHome = require('./admin/AdminHome');
var ChemScanner = require('./components/chemscanner/ChemScanner');
var ChemSpectra = require('./components/chemspectra/ChemSpectra');
var ChemSpectraEditor = require('./components/chemspectra/ChemSpectraEditor');
var MoleculeModerator = require('./components/MoleculeModerator');
var RepoNewsEditor = require('./libHome/RepoNewsEditor');
var RepoNewsReader = require('./libHome/RepoNewsReader');
var RepoHowToEditor = require('./libHome/RepoHowToEditor');
var RepoHowToReader = require('./libHome/RepoHowToReader');
var App = require('./components/App');

//= require_self
//= require react_ujs
