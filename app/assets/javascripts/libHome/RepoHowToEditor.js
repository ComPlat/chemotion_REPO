import React, { Component } from 'react';
import { Alert, Jumbotron, Row, Col, Form, FormGroup, FormControl, ControlLabel, Button, InputGroup } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import moment from 'moment';
import ArticleFetcher from '../components/fetchers/ArticleFetcher';
import NewsPreviewModal from '../components/common/NewsPreviewModal';
import PublicStore from '../components/stores/PublicStore';
import { ConfirmModal } from '../components/common/ConfirmModal';
import Attachment from '../components/models/Attachment';
import { EditorTips, DateFormatDMYTime } from '../libHome/RepoCommon';
import { contentToText } from '../components/utils/quillFormat';
import { EditorBtn, EditorBaseBtn } from './RepoHowTo/EditorBtn';
import EditorStelle from './RepoHowTo/EditorStelle';

const extractIntro = (article) => {
  const result = article.filter(a => a.art === 'txt');
  if (result.length < 1) {
    return '';
  }
  return (contentToText(result[0].quill) || '').slice(0, 1500);
};

const confirmText = (
  <ControlLabel>Are you sure that you want to delete this ?</ControlLabel>
);

const stelle = props => ({ art: props.art || '', quill: props.quill || null, pfad: props.pfad || '' });

export default class RepoHowToEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      howto: PublicStore.getState().howto && PublicStore.getState().howto.key ? { ...PublicStore.getState().howto } : { title: '', content: {}, article: [] },
      message: { type: '', content: '' },
      showPreview: false,
      showDeleteModal: false
    };

    this.onInputChange = this.onInputChange.bind(this);
    this.onClickPreview = this.onClickPreview.bind(this);
    this.onClickCurrentTime = this.onClickCurrentTime.bind(this);
    this.onClickClose = this.onClickClose.bind(this);
    this.onClickSave = this.onClickSave.bind(this);
    this.onClickDelete = this.onClickDelete.bind(this);
    this.handleDismiss = this.handleDismiss.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onShowDeleteModal = this.onShowDeleteModal.bind(this);
    this.onEditorBtnClick = this.onEditorBtnClick.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onEditorBtnClick(e) {
    const { howto } = this.state;
    howto.article.push(stelle({ art: e }));
    this.setState(howto);
  }

  onEditorBaseBtnClick(e) {
    switch (e) {
      case 'save':
        this.onClickSave();
        break;
      case 'delete':
        this.onShowDeleteModal();
        break;
      default:
    }
  }

  onStelleDrop(e) {
    const { howto } = this.state;
    const { article } = howto;

    article[e.sourceTag.sid] = e.targetTag.stelle;
    article[e.targetTag.sid] = e.sourceTag.stelle;

    howto.article = article;
    this.setState(howto);
  }

  onStelleRemove(e) {
    const { howto } = this.state;
    howto.article.splice(e, 1);
    this.setState(howto);
  }

  onStelleInputChange(art, e, sid) {
    const { howto } = this.state;
    switch (art) {
      case 'quill':
        howto.article[sid].quill = e;
        this.setState(howto);
        break;
      case 'pfad':
        this.handleImage(e, sid);
        break;
      default:
        break;
    }
  }

  onChange(state) {
    if (state.howto && state.howto.key) {
      this.setState(prevState => ({
        ...prevState, howto: state.howto
      }));
    } else {
      this.setState(prevState => ({
        ...prevState, howto: { title: '', content: {}, article: [] }
      }));
    }
  }

  onInputChange(type, event) {
    const { howto } = this.state;
    switch (type) {
      case 'title':
        howto.title = event.currentTarget.value;
        break;
      case 'content':
        howto.content = event;
        break;
      case 'published_at':
        howto.published_at = event.currentTarget.value.trim();
        break;
      case 'updated_at':
        howto.updated_at = event.currentTarget.value.trim();
        break;
      default:
        break;
    }
    this.setState({ howto });
  }

  onClickCurrentTime(type) {
    const currentTime = new Date().toLocaleString('en-GB').split(', ').join(' ');
    const wrappedEvent = { currentTarget: { value: currentTime } };
    this.onInputChange(type, wrappedEvent);
  }

  onClickPreview() {
    this.setState({ showPreview: true });
  }

  onClickClose() {
    this.setState({ showPreview: false });
  }

  onClickSave() {
    const { howto } = this.state;
    let m = moment(howto.published_at, 'DD/MM/YYYY HH:mm:ss');
    if (howto.published_at && howto.published_at !== '' && !m.isValid()) {
      howto.published_at = DateFormatDMYTime(howto.published_at);
    }
    m = moment(howto.published_at, 'DD/MM/YYYY HH:mm:ss');

    if ((typeof howto.title === 'undefined') || !howto.title || howto.title.trim() === '') {
      this.setState({ message: { type: 'danger', content: 'Ooops! Title can not be empty!' } });
    } else if (howto.published_at && howto.published_at !== '' && !m.isValid()) {
      this.setState({ message: { type: 'danger', content: 'Ooops! Published On is invalid !' } });
    } else {
      howto.firstParagraph = extractIntro(howto.article);
      ArticleFetcher.createOrUpdateHowTo(howto)
        .then((result) => {
          if (result.error) {
            this.setState({ message: { type: 'danger', content: `Ooops! You got an error! ${result.error}` } });
          } else {
            this.setState({
              howto: { title: '', content: {}, article: [] },
              message: { type: 'success', content: 'Send to How-To successfully!' }
            });
          }
        });
    }
  }

  onShowDeleteModal() {
    this.setState({ showDeleteModal: true });
  }

  onClickDelete(isDelete) {
    if (isDelete) {
      const { howto } = this.state;
      ArticleFetcher.deleteHowTo(howto)
        .then((result) => {
          if (result.error) {
            this.setState({ message: { type: 'danger', content: `Ooops! You got an error! ${result.error}` } });
          } else {
            this.setState({ howto: { title: '', content: {}, article: [] }, message: { type: 'success', content: 'Deleted successfully!' } });
          }
        });
    }
    this.setState({ showDeleteModal: false });
  }

  handleImage(files, sid) {
    const { howto } = this.state;
    const image = Attachment.fromFile(files[0]);
    ArticleFetcher.updateEditorImage(image, 'howto')
      .then((result) => {
        if (result.error) {
          this.setState({ message: { type: 'danger', content: `Ooops! You got an error! ${result.error}` } });
        } else {
          howto.article[sid].pfad = result.pfad_image;
          this.setState(howto);
        }
      });
  }

  handleDismiss() {
    this.setState({ message: { type: '', content: '' } });
  }

  deleteNewButton() {
    const { howto } = this.state;
    if (typeof (howto.key) === 'undefined' || !howto.key || howto.key === 'new') {
      return (
        <span />
      );
    }
    return (
      <Button bsStyle="danger" onClick={() => this.onShowDeleteModal()} className="button-right">
        Delete
      </Button>
    );
  }

  coverImage() {
    let imageUrl = '';
    const { howto } = this.state;
    if (typeof (howto) !== 'undefined' && howto &&
      typeof (howto.cover_image) !== 'undefined' && howto.cover_image) {
      imageUrl = `/howto/${howto.cover_image}`;
    }

    return (
      <div>
        <h4><b>How-To Cover</b></h4>
        <h5>Click on the image to change the cover</h5>
        <span style={{ width: '400px', height: '268px' }}>
          <Dropzone
            onDrop={files => this.handleFileDrop(files)}
            style={{ height: '100%', width: '100%', border: '3px dashed lightgray' }}
          >
            {
              imageUrl === '' ?
                <div style={{ textAlign: 'center' }}>
                  <i className="fa fa-quote-left fa-2x" aria-hidden="true" />
                  <span style={{ fontSize: '3em', fontWeight: 'bold' }}>&nbsp;HOW TO&nbsp;</span>
                  <i className="fa fa-quote-right fa-2x" aria-hidden="true" style={{ position: 'absolute' }} />
                </div>
              :
                <img
                  src={imageUrl}
                  style={{
                    display: 'block',
                    maxHeight: '100%',
                    maxWidth: '100%',
                  }}
                  alt=""
                />
            }
          </Dropzone>
        </span>
      </div>
    );
  }

  handleFileDrop(files) {
    const { howto } = this.state;
    if (files && files.length > 0) {
      const image = Attachment.fromFile(files[0]);
      ArticleFetcher.updateEditorImage(image, 'howto')
        .then((result) => {
          if (result.error) {
            this.setState({ message: { type: 'danger', content: `Ooops! You got an error! ${result.error}` } });
          } else {
            howto.cover_image = result.cover_image;
            this.setState({ howto, message: { type: 'success', content: 'Cover image added successfully!' } });
          }
        });
    }
  }

  render() {
    const {
      howto,
      message,
      showPreview,
      showDeleteModal
    } = this.state;
    const renderAlert = (m) => {
      return (
        m.type !== '' ?
          <Alert bsStyle={m.type} onDismiss={this.handleDismiss}>
            <p>
              {m.content}
            </p>
          </Alert>
          :
          <div />
      );
    };

    const tPublished = howto.published_at == null ? '' : DateFormatDMYTime(howto.published_at);
    const tUpdated = howto.updated_at == null ? '' : DateFormatDMYTime(howto.updated_at);
    const stelles = howto.article.map((s, i) => {
      return (
        <EditorStelle
          key={i}
          sid={i}
          stelle={s}
          onDrop={e => this.onStelleDrop(e)}
          onRemove={e => this.onStelleRemove(e)}
          onChange={(art, e, sid) => this.onStelleInputChange(art, e, sid)}
          editor_type="howto"
        />
      );
    });

    return (
      <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#eeeeee' }}>
        <NewsPreviewModal
          showModal={showPreview}
          article={howto}
          onClick={this.onClickClose}
        />
        <ConfirmModal
          showModal={showDeleteModal}
          title="Are you sure ?"
          content={confirmText}
          onClick={this.onClickDelete}
        />
        <Jumbotron style={{
          minHeight: 'calc(85vh)', width: 'calc(96vw)', padding: '24px 60px', marginBottom: 'unset'
        }}
        >
          <Row>
            <Col lg={1} />
            <Col lg={8} md={8}>
              {renderAlert(message)}
              <h2><b>How-To Editor</b></h2>
              <p>
                Give Chemotion readers some advice
              </p>
              <br />
              <Form>
                <FormGroup controlId="frmNewsTitile">
                  <ControlLabel>
                    <div className="newseditor">
                      <div className="required">*&nbsp;</div>
                      <div className="article_title">Title</div>
                      <div className="article_content"><i className="fa fa-exclamation-circle" aria-hidden="true" />&nbsp;100 characters limitation.</div>
                      {howto.created_at ? <div className="required">This howto was published on {tPublished}</div> : <div />}
                    </div>
                  </ControlLabel>
                  <FormControl
                    placeholder="Title"
                    value={howto.title || ''}
                    onChange={event => this.onInputChange('title', event)}
                    maxLength={100}
                  />
                </FormGroup>
                <ControlLabel>
                  <div className="newseditor">
                    <div className="required">*&nbsp;</div>
                    <div className="article_title">Content</div>
                  </div>
                </ControlLabel>
                <div className="editor-field">
                  {stelles}
                  <EditorBtn onClick={e => this.onEditorBtnClick(e)} />
                </div>
                <EditorBaseBtn onClick={e => this.onEditorBaseBtnClick(e)} />
              </Form>
            </Col>
            <Col lg={3} md={4}>
              <div>
                {this.coverImage()}
                <br />
                <FormGroup>
                  <ControlLabel><h4><b>Published on</b></h4></ControlLabel>
                  <InputGroup>
                    <FormControl
                      type="text"
                      value={tPublished}
                      placeholder="DD/MM/YYYY hh:mm:ss"
                      onChange={event => this.onInputChange('published_at', event)}
                    />
                    <InputGroup.Button>
                      <Button
                        active
                        style={{ padding: '6px' }}
                        onClick={this.onClickCurrentTime.bind(this, 'published_at')}
                      >
                        <i className="fa fa-clock-o" />
                      </Button>
                    </InputGroup.Button>
                  </InputGroup>
                  <ControlLabel><h4><b>Updated on</b></h4></ControlLabel>
                  <InputGroup>
                    <FormControl
                      type="text"
                      value={tUpdated}
                      placeholder="DD/MM/YYYY hh:mm:ss"
                      onChange={event => this.onInputChange('updated_at', event)}
                    />
                    <InputGroup.Button>
                      <Button
                        active
                        style={{ padding: '6px' }}
                        onClick={this.onClickCurrentTime.bind(this, 'updated_at')}
                      >
                        <i className="fa fa-clock-o" />
                      </Button>
                    </InputGroup.Button>
                  </InputGroup>
                </FormGroup>
                <i className="fa fa-lightbulb-o" aria-hidden="true" />&nbsp;Tips:<br />
                <EditorTips />
              </div>
            </Col>
          </Row>
        </Jumbotron>
      </div>
    );
  }
}
