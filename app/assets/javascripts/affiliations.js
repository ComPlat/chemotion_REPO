let affiliationData = null;

// Fetch all affiliation data from the combined endpoint
function fetchAffiliationData() {
  return fetch('/api/v1/public/affiliations/all_data')
    .then(response => response.json())
    .then(data => {
      affiliationData = data;
      return data;
    })
    .catch(error => {
      console.error("Error loading affiliation data:", error);
      return {};
    });
}

// Get data based on the required type
function getDataByType(type) {
  if (!affiliationData) {
    return [];
  }

  if (type === 'countries') {
    return affiliationData.countries || [];
  } else if (type === 'organizations') {
    return Object.keys(affiliationData.organizations || {});
  } else if (type === 'departments') {
    const allDepts = [];
    Object.values(affiliationData.organizations || {}).forEach(org => {
      Object.keys(org.departments || {}).forEach(dept => {
        if (dept && !allDepts.includes(dept)) {
          allDepts.push(dept);
        }
      });
    });
    return allDepts;
  } else if (type === 'groups') {
    const allGroups = [];
    Object.values(affiliationData.organizations || {}).forEach(org => {
      Object.values(org.departments || {}).forEach(dept => {
        (dept.groups || []).forEach(group => {
          if (group && !allGroups.includes(group)) {
            allGroups.push(group);
          }
        });
      });
    });
    return allGroups;
  }
  return [];
}

// Get departments for a specific organization
function getDepartmentsForOrganization(organization) {
  if (!affiliationData || !organization) {
    return [];
  }

  const orgData = affiliationData.organizations ? affiliationData.organizations[organization] : null;
  if (!orgData || !orgData.departments) {
    return [];
  }

  return Object.keys(orgData.departments);
}

// Get groups for a specific organization and department
function getGroupsForDepartment(organization, department) {
  if (!affiliationData || !organization || !department) {
    return [];
  }

  const orgData = affiliationData.organizations ? affiliationData.organizations[organization] : null;
  if (!orgData || !orgData.departments || !orgData.departments[department]) {
    return [];
  }

  return orgData.departments[department].groups || [];
}

function attachAutoComplete(type, elementId) {
  // If we already have the data, use it directly
  if (affiliationData) {
    const data = getDataByType(type);
    setupAutoComplete(data, elementId);
    return;
  }

  // Otherwise, fetch data first
  fetchAffiliationData()
    .then(() => {
      const data = getDataByType(type);
      setupAutoComplete(data, elementId);
    });
}

function setupAutoComplete(data, elementId) {
  const elementSelector = `input[id="${elementId}"]`;
  const element = document.querySelector(elementSelector);

  if (!element) {
    console.error(`Element with ID ${elementId} not found`);
    return;
  }

  // Store reference to autocomplete instance on the element
  const instance = new autoComplete({
    selector: element,
    minChars: elementId === 'department-select' ? 0 : 2, // Show all departments on empty input
    source(term, suggest) {
      term = term.toLowerCase();
      const matches = [];
      for (let i = 0; i < data.length; i++) {
        if (~data[i].toLowerCase().indexOf(term)) {
          matches.push(data[i]);
        }
      }
      suggest(matches);
    }
  });

  // Store instance reference on element for later access
  element._autocomplete = instance;

  // Special handling for department field to show all options on focus when empty
  if (elementId === 'department-select') {
    element.addEventListener('focus', function() {
      if (this.value === '') {
        // Trigger autocomplete to show all options
        const event = new Event('input', { bubbles: true });
        this.dispatchEvent(event);
      }
    });
  }

  return instance;
}

// Setup cascade filtering between organization, department, and group inputs
function setupCascadeFiltering() {
  console.log("Setting up cascade filtering...");
  const orgInput = document.querySelector('input#organization-select');
  const deptInput = document.querySelector('input#department-select');
  const groupInput = document.querySelector('input#group-select');

  if (orgInput && deptInput) {
    // Handle both change and input events for better compatibility with autocomplete
    ['change', 'input', 'autocompleteselect'].forEach(eventType => {
      orgInput.addEventListener(eventType, () => {
        console.log(`Organization ${eventType} event - value: ${orgInput.value}`);
        const organization = orgInput.value;

        // Clear department and group when organization changes
        if (deptInput.value) {
          deptInput.value = '';
        }
        if (groupInput && groupInput.value) {
          groupInput.value = '';
        }

        // Update department autocomplete with filtered data
        if (organization) {
          console.log(`Filtering departments for: ${organization}`);
          const departments = getDepartmentsForOrganization(organization);
          console.log(`Found ${departments.length} departments for ${organization}`);

          // Force destroy any existing autocomplete
          if (window.autoComplete && deptInput._autocomplete) {
            try {
              deptInput._autocomplete.destroy();
            } catch (e) {
              console.log("Error destroying autocomplete:", e);
            }
          }

          // Create new autocomplete with filtered departments only
          setupAutoComplete(departments, 'department-select');

          // Update placeholder to indicate filtering
          deptInput.placeholder = `Departments for ${organization}`;
        }
      });
    });

    // Also track focus events to show dropdown
    deptInput.addEventListener('focus', function() {
      if (orgInput.value && deptInput.value === '') {
        // Trigger input event to show filtered departments
        const event = new Event('input', { bubbles: true });
        deptInput.dispatchEvent(event);
      }
    });

    // Check if organization already has value on page load
    if (orgInput.value) {
      console.log(`Initial organization value: ${orgInput.value}`);
      setTimeout(() => {
        const organization = orgInput.value;
        const departments = getDepartmentsForOrganization(organization);
        console.log(`Initially found ${departments.length} departments for ${organization}`);
        setupAutoComplete(departments, 'department-select');
        deptInput.placeholder = `Departments for ${organization}`;
      }, 500); // Allow time for data to load
    }
  }

  if (deptInput && groupInput) {
    deptInput.addEventListener('change', () => {
      const organization = orgInput ? orgInput.value : '';
      const department = deptInput.value;

      // Clear group when department changes
      if (groupInput.value) {
        groupInput.value = '';
      }

      // Update group autocomplete with filtered data
      if (organization && department) {
        const groups = getGroupsForDepartment(organization, department);
        setupAutoComplete(groups, 'group-select');
      }
    });
  }
}

(function () {
  document.querySelector('form').addEventListener('keypress', (e) => function (e) {
    if (e.keyCode == 13) {
      return false;
    }
  });

  // Fetch all data once at the beginning
  fetchAffiliationData().then(() => {
    // Setup individual autocompletes
    attachAutoComplete("countries", "country-select");
    attachAutoComplete("organizations", "organization-select");
    attachAutoComplete("departments", "department-select");
    if (document.querySelector('input#group-select')) {
      attachAutoComplete("groups", "group-select");
    }

    // Setup cascade filtering between fields
    setupCascadeFiltering();
  });
}());
