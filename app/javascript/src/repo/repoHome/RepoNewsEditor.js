import React, { Component } from 'react';
import {
  Alert,
  Button,
  Col,
  Form,
  InputGroup,
  Row,
  Container,
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import moment from 'moment';
import ArticleFetcher from 'src/repo/fetchers/ArticleFetcher';
import NewsPreviewModal from 'src/repo/others/NewsPreviewModal';
import PublicStore from 'src/repo/stores/PublicStore';
import ConfirmModal from 'src/components/common/ConfirmModal';
import Attachment from 'src/models/Attachment';
import { EditorTips, DateFormatDMYTime } from 'src/repo/repoHome/RepoCommon';
import { contentToText } from 'src/utilities/quillFormat';
import { EditorBtn, EditorBaseBtn } from 'src/repo/libHome/RepoHowTo/EditorBtn';
import EditorStelle from 'src/repo/libHome/RepoHowTo/EditorStelle';

const NewsroomTemplate = {
  title: '',
  content: {},
  article: [],
};

const extractIntro = (article) => {
  const result = article.filter((a) => a.art === 'txt');
  if (result.length < 1) {
    return '';
  }
  return (contentToText(result[0].quill) || '').slice(0, 1500);
};

const confirmText = (
  <Form.Label>Are you sure that you want to delete this ?</Form.Label>
);

const stelle = (props) => ({
  art: props.art || '',
  quill: props.quill || null,
  pfad: props.pfad || '',
});

export default class RepoNewsEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      news:
        PublicStore.getState().news && PublicStore.getState().news.key
          ? { ...PublicStore.getState().news }
          : NewsroomTemplate,
      message: { type: '', content: '' },
      showPreview: false,
      showDeleteModal: false,
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
    const { news } = this.state;
    news.article.push(stelle({ art: e }));
    this.setState({ news });
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
    const { news } = this.state;
    const { article } = news;

    article[e.sourceTag.sid] = e.targetTag.stelle;
    article[e.targetTag.sid] = e.sourceTag.stelle;

    news.article = article;
    this.setState({ news });
  }

  onStelleRemove(e) {
    const { news } = this.state;
    news.article.splice(e, 1);
    this.setState({ news });
  }

  onStelleInputChange(art, e, sid) {
    const { news } = this.state;
    switch (art) {
      case 'quill':
        news.article[sid].quill = e;
        this.setState({ news });
        break;
      case 'pfad':
        this.handleImage(e, sid);
        break;
      default:
        break;
    }
  }

  onChange(state) {
    if (state.news && state.news.key) {
      this.setState((prevState) => ({
        ...prevState,
        news: state.news,
      }));
    } else {
      this.setState((prevState) => ({
        ...prevState,
        news: NewsroomTemplate,
      }));
    }
  }

  onInputChange(type, event) {
    const { news } = this.state;
    switch (type) {
      case 'title':
        news.title = event.currentTarget.value;
        break;
      case 'content':
        news.content = event;
        break;
      case 'published_at':
        news.published_at = event.currentTarget.value.trim();
        break;
      case 'updated_at':
        news.updated_at = event.currentTarget.value.trim();
        break;
      default:
        break;
    }
    this.setState({ news });
  }

  onClickCurrentTime(type) {
    const currentTime = new Date()
      .toLocaleString('en-GB')
      .split(', ')
      .join(' ');
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
    const { news } = this.state;
    let m = moment(news.published_at, 'DD/MM/YYYY HH:mm:ss');
    if (news.published_at && news.published_at !== '' && !m.isValid()) {
      news.published_at = DateFormatDMYTime(news.published_at);
    }
    m = moment(news.published_at, 'DD/MM/YYYY HH:mm:ss');

    if (
      typeof news.title === 'undefined' ||
      !news.title ||
      news.title.trim() === ''
    ) {
      this.setState({
        message: { type: 'danger', content: 'Ooops! Title can not be empty!' },
      });
    } else if (news.published_at && news.published_at !== '' && !m.isValid()) {
      this.setState({
        message: {
          type: 'danger',
          content: 'Ooops! Published On is invalid !',
        },
      });
    } else {
      news.firstParagraph = extractIntro(news.article);
      ArticleFetcher.createOrUpdate(news).then((result) => {
        if (result.error) {
          this.setState({
            message: {
              type: 'danger',
              content: `Ooops! You got an error! ${result.error}`,
            },
          });
        } else {
          this.setState({
            news: NewsroomTemplate,
            message: {
              type: 'success',
              content: 'Send to Newsroom successfully!',
            },
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
      const { news } = this.state;
      ArticleFetcher.delete(news).then((result) => {
        if (result.error) {
          this.setState({
            message: {
              type: 'danger',
              content: `Ooops! You got an error! ${result.error}`,
            },
          });
        } else {
          this.setState({
            news: NewsroomTemplate,
            message: { type: 'success', content: 'Deleted successfully!' },
          });
        }
      });
    }
    this.setState({ showDeleteModal: false });
  }

  handleImage(files, sid) {
    const { news } = this.state;
    const image = Attachment.fromFile(files[0]);
    ArticleFetcher.updateEditorImage(image, 'newsroom').then((result) => {
      if (result.error) {
        this.setState({
          message: {
            type: 'danger',
            content: `Ooops! You got an error! ${result.error}`,
          },
        });
      } else {
        news.article[sid].pfad = result.pfad_image;
        this.setState({ news });
      }
    });
  }

  handleDismiss() {
    this.setState({ message: { type: '', content: '' } });
  }

  deleteNewButton() {
    const { news } = this.state;
    if (!news.key || news.key === 'new') return null;
    return (
      <Button
        variant="danger"
        onClick={() => this.onShowDeleteModal()}
        className="button-right"
      >
        Delete
      </Button>
    );
  }

  coverImage() {
    const { news } = this.state;
    const imageUrl = news?.cover_image
      ? `/newsroom/${news.cover_image}`
      : '/images/repo/news_cover.png';

    return (
      <div className="bbce-cover">
        <div className="bbce-label">News cover</div>
        <div className="bbce-hint">Click or drop an image to change the cover</div>
        <Dropzone
          onDrop={(files) => this.handleFileDrop(files)}
          className="bbce-dropzone"
        >
          <img src={imageUrl} alt="" />
        </Dropzone>
      </div>
    );
  }

  handleFileDrop(files) {
    const { news } = this.state;
    if (files && files.length > 0) {
      const image = Attachment.fromFile(files[0]);
      ArticleFetcher.updateEditorImage(image, 'newsroom').then((result) => {
        if (result.error) {
          this.setState({
            message: {
              type: 'danger',
              content: `Ooops! You got an error! ${result.error}`,
            },
          });
        } else {
          news.cover_image = result.cover_image;
          this.setState({
            news,
            message: {
              type: 'success',
              content: 'Cover image added successfully!',
            },
          });
        }
      });
    }
  }

  render() {
    const { news, message, showPreview, showDeleteModal } = this.state;
    const renderAlert = (m) => {
      if (!m.type) return null;
      return (
        <Alert variant={m.type} onClose={this.handleDismiss} dismissible>
          <p>{m.content}</p>
        </Alert>
      );
    };

    const tPublished =
      news.published_at == null ? '' : DateFormatDMYTime(news.published_at);
    const tUpdated =
      news.updated_at == null ? '' : DateFormatDMYTime(news.updated_at);

    const stelles = news.article.map((s, i) => {
      return (
        <EditorStelle
          key={i}
          sid={i}
          stelle={s}
          onDrop={(e) => this.onStelleDrop(e)}
          onRemove={(e) => this.onStelleRemove(e)}
          onChange={(art, e, sid) => this.onStelleInputChange(art, e, sid)}
          editor_type="newsroom"
        />
      );
    });

    return (
      <div className="bbc-editor">
        <div className="bbc-bar" aria-hidden="true" />
        <Container fluid className="bbce-container">
          <NewsPreviewModal
            showModal={showPreview}
            article={news}
            onClick={this.onClickClose}
          />
          <ConfirmModal
            showModal={showDeleteModal}
            title="Are you sure ?"
            content={confirmText}
            onClick={this.onClickDelete}
          />
          <Row className="justify-content-center">
            <Col lg={11} xl={10}>
              <header className="bbce-masthead">
                <span className="bbc-tag">Editor</span>
                <h1>Newsroom Editor</h1>
                <p>Create and manage Chemotion news articles.</p>
              </header>

              {renderAlert(message)}

              <div className="bbce-panel">
                <Row className="g-4">
                  <Col lg={8} md={7}>
                    <Form>
                      <Form.Group controlId="frmNewsTitile" className="mb-4">
                        <div className="bbce-field-head">
                          <Form.Label className="bbce-field-label">
                            <span className="bbce-required">*</span> Title
                          </Form.Label>
                          <span className="bbce-field-hint">
                            <i className="fa fa-exclamation-circle me-1" aria-hidden="true" />
                            100 characters max
                          </span>
                          {news.created_at && (
                            <span className="bbce-field-stamp">
                              Published {tPublished}
                            </span>
                          )}
                        </div>
                        <Form.Control
                          placeholder="Title"
                          value={news.title || ''}
                          onChange={(event) => this.onInputChange('title', event)}
                          maxLength={100}
                        />
                      </Form.Group>

                      <div className="bbce-field-head">
                        <Form.Label className="bbce-field-label">
                          <span className="bbce-required">*</span> Content
                        </Form.Label>
                      </div>
                      <div className="editor-field bbce-editor-field">
                        {stelles}
                        <EditorBtn onClick={(e) => this.onEditorBtnClick(e)} />
                      </div>

                      <hr className="bbce-divider" />
                      <EditorBaseBtn
                        onClick={(e) => this.onEditorBaseBtnClick(e)}
                      />
                    </Form>
                  </Col>

                  <Col lg={4} md={5}>
                    <aside className="bbce-sidebar">
                      {this.coverImage()}

                      <Form.Group className="bbce-dates">
                        <div className="bbce-field-head">
                          <Form.Label className="bbce-field-label">
                            Published on
                          </Form.Label>
                        </div>
                        <InputGroup className="mb-3">
                          <Form.Control
                            type="text"
                            value={tPublished}
                            placeholder="DD/MM/YYYY hh:mm:ss"
                            onChange={(event) =>
                              this.onInputChange('published_at', event)
                            }
                          />
                          <Button
                            variant="outline-secondary"
                            title="Use current time"
                            onClick={this.onClickCurrentTime.bind(
                              this,
                              'published_at',
                            )}
                          >
                            <i className="fa fa-clock-o" />
                          </Button>
                        </InputGroup>

                        <div className="bbce-field-head">
                          <Form.Label className="bbce-field-label">
                            Updated on
                          </Form.Label>
                        </div>
                        <InputGroup>
                          <Form.Control
                            type="text"
                            value={tUpdated}
                            placeholder="DD/MM/YYYY hh:mm:ss"
                            onChange={(event) =>
                              this.onInputChange('updated_at', event)
                            }
                          />
                          <Button
                            variant="outline-secondary"
                            title="Use current time"
                            onClick={this.onClickCurrentTime.bind(
                              this,
                              'updated_at',
                            )}
                          >
                            <i className="fa fa-clock-o" />
                          </Button>
                        </InputGroup>
                      </Form.Group>

                      <div className="bbce-tips">
                        <div className="bbce-tips-head">
                          <i className="fa fa-lightbulb-o me-2" aria-hidden="true" />
                          Tips
                        </div>
                        <EditorTips />
                      </div>
                    </aside>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}
