import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';

export default class UserSettingsFetcher extends BaseFetcher {
  static affiliationData = null;

  // Add missing HTTP helper methods
  static post(resource, id, data) {
    const endpoint = id ? `/api/v1/${resource}/${id}` : `/api/v1/${resource}`;
    return fetch(endpoint, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(response => response.json());
  }

  static put(resource, id, data) {
    return fetch(`/api/v1/${resource}/${id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(response => response.json());
  }

  static delete(resource, id) {
    return fetch(`/api/v1/${resource}/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => response.json());
  }

  // Fetch all affiliation data in hierarchical structure
  static fetchAffiliationData() {
    return fetch('/api/v1/public/affiliations/all_data', {
      credentials: 'same-origin',
    })
    .then((response) => response.json())
    .then((json) => {
      this.affiliationData = json;
      return json;
    });
  }

  // Get organizations as options for the Select component
  static getOrganizationOptions() {
    if (!this.affiliationData) {
      return this.fetchAffiliationData().then(data => {
        const organizations = data.organizations || {};
        return Object.keys(organizations).map(org => ({ value: org, label: org }));
      });
    }

    const organizations = this.affiliationData.organizations || {};
    return Promise.resolve(
      Object.keys(organizations).map(org => ({ value: org, label: org }))
    );
  }

  // Get departments for a specific organization as options for the Select component
  static getDepartmentOptions(organization) {
    if (!organization) return Promise.resolve([]);

    if (!this.affiliationData) {
      return this.fetchAffiliationData().then(data => {
        const organizations = data.organizations || {};
        const orgData = organizations[organization];
        if (!orgData || !orgData.departments) return [];

        return Object.keys(orgData.departments).map(dept =>
          ({ value: dept, label: dept })
        );
      });
    }

    const organizations = this.affiliationData.organizations || {};
    const orgData = organizations[organization];
    if (!orgData || !orgData.departments) return Promise.resolve([]);

    return Promise.resolve(
      Object.keys(orgData.departments).map(dept =>
        ({ value: dept, label: dept })
      )
    );
  }

  // Get groups for a specific organization and department as options for the Select component
  static getGroupOptions(organization, department) {
    if (!organization || !department) return Promise.resolve([]);

    if (!this.affiliationData) {
      return this.fetchAffiliationData().then(data => {
        const organizations = data.organizations || {};
        const orgData = organizations[organization];
        if (!orgData || !orgData.departments || !orgData.departments[department]) return [];

        return orgData.departments[department].groups.map(group =>
          ({ value: group, label: group })
        );
      });
    }

    const organizations = this.affiliationData.organizations || {};
    const orgData = organizations[organization];
    if (!orgData || !orgData.departments || !orgData.departments[department]) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      orgData.departments[department].groups.map(group =>
        ({ value: group, label: group })
      )
    );
  }

  static fetchUsersByName(nameParams) {
    return fetch('/api/v1/collaborators/user?' + new URLSearchParams(nameParams), {
      credentials: 'same-origin',
    }).then((response) => response.json())
      .then((json) => json.users);
  }

  static fetchUserByID(userID) {
    return fetch(`/api/v1/users/${userID}`, {
      credentials: 'same-origin',
    }).then((response) => response.json())
      .then((json) => json);
  }

  static findOrCreateAff(affParams) {
    const paramString = `department=${encodeURIComponent(affParams.department)}&organization=${encodeURIComponent(affParams.organization)}&country=${encodeURIComponent(affParams.country)}`;
    return fetch('/api/v1/collaborators/find_add_aff', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: paramString
    }).then((response) => response.json())
      .then((json) => json);
  }


  static getAllAffiliations() {
    return fetch('/api/v1/affiliations', {
      credentials: 'same-origin',
    }).then((response) => response.json());
  }

  static getProfile() {
    return fetch('/api/v1/profiles', {
      credentials: 'same-origin',
    }).then((response) => response.json());
  }

  static createAffiliation(affiliation) {
    return fetch('/api/v1/affiliations', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(affiliation)
    }).then(response => response.json());
  }

  static updateAffiliation(affiliation) {
    return fetch(`/api/v1/affiliations/${affiliation.id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organization: affiliation.organization,
        group: affiliation.group,
        country: affiliation.country,
        department: affiliation.department,
        from: affiliation.from,
        to: affiliation.to,
      })
    }).then(response => response.json());
  }

  static deleteAffiliation(id) {
    return fetch(`/api/v1/affiliations/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => {
      // For 204 No Content responses, return an empty object instead of trying to parse JSON
      return response.status === 204 ? {} : response.json();
    });
  }

  static updateUserSetting(payload) {
    return fetch('/api/v1/users', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user: payload
      })
    }).then((response) => response.json())
      .then(json => json);
  }

  static updateProfile(data) {
    let rqBody = null;
    if (data != null) { rqBody = { profile: data }; }

    return fetch('/api/v1/profiles', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rqBody)
    }).then((response) => response.json())
      .then((json) => json);
  }

  static uploadAvatarImg(img, name) {
    const fd = new FormData();
    fd.append('file', img, name);

    return fetch('/api/v1/upload_avatar', {
      credentials: 'same-origin',
      method: 'POST',
      body: fd
    });
  }
}
