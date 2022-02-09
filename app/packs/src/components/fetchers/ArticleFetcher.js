import 'whatwg-fetch';

export default class ArticleFetcher {
  static initial() {
    const promise = fetch('/api/v1/public/article_init.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static createOrUpdate(params) {
    const promise = fetch('/api/v1/articles/create_or_update/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static delete(params) {
    const promise = fetch(`/api/v1/articles/${params.key}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static initialHowTo() {
    const promise = fetch('/api/v1/public/howto_init.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static createOrUpdateHowTo(params) {
    const promise = fetch('/api/v1/articles/create_or_update_howto/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static deleteHowTo(params) {
    const promise = fetch('/api/v1/articles/delete_howto', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static updateEditorImage(file, editorType) {
    const data = new FormData();
    data.append('file[]', file.file, file.name);
    data.append('editor_type', editorType);
    const promise = fetch('/api/v1/articles/editor_image', {
      credentials: 'same-origin',
      method: 'POST',
      body: data
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
}
