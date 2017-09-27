import Element from './Element';

export default class Literature extends Element {
  static buildEmpty() {
    return new Literature({
      title: '',
      url: '',
      doi: '',
      type: 'literature',
      is_new: false,
      refs: {},
      element_type: ''
    })
  }

  serialize() {
    return ({
      id: this.id,
      title: this.title,
      url: this.url,
      doi: this.doi,
      type: this.type,
      is_new: this.isNew || false,
      refs: this.refs || {},
      element_type: this.element_type
    });
  }
}
