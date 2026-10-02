import 'whatwg-fetch';

export default class UserSettingsFetcher {
  static getAutoCompleteSuggestions(type) {
    return fetch(
      `/api/v1/public/affiliations/${type}`
    ).then((response) => response.json())
      .then((data) => {
        return data
          .filter(item => item && item.trim() !== '')
          .map(item => ({ value: item, label: item }));
      })
      .catch((error) => {
        console.log(error);
      });
  }

  static getAllAffiliations() {
    return fetch(
      '/api/v1/affiliations/'
    ).then((response) => response.json())
      .then((data) => data)
      .catch((error) => {
        console.log(error);
      });
  }

  static createAffiliation(params) {
    return fetch('/api/v1/affiliations/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }).then((response) => response.json())
      .then((data) => data)
      .catch((error) => {
        console.log(error);
      });
  }

  static updateAffiliation(params) {
    return fetch('/api/v1/affiliations/', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
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


  static deleteAffiliation(id) {
    return fetch(`/api/v1/affiliations/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }
}
