/**
 * Enhanced department filtering based on organization selection
 */

document.addEventListener('DOMContentLoaded', function() {
  setupOrganizationDepartmentFiltering();
});

function setupOrganizationDepartmentFiltering() {
  const orgField = document.getElementById('organization-select');
  const deptField = document.getElementById('department-select');

  if (!orgField || !deptField) {
    console.log("Organization or department fields not found");
    return;
  }

  // Store affiliationData for later use
  let affiliationData = null;

  // Create hidden container for filtered departments
  const hiddenContainer = document.createElement('div');
  hiddenContainer.id = 'filtered-departments-container';
  hiddenContainer.style.display = 'none';
  document.body.appendChild(hiddenContainer);

  // Fetch data
  fetch('/api/v1/public/affiliations/all_data')
    .then(response => response.json())
    .then(data => {
      affiliationData = data;
      console.log("Loaded affiliation data for filtering");

      // Set up organization change event
      orgField.addEventListener('change', function() {
        filterDepartmentsByOrganization(orgField.value);
      });

      // Set up organization input event (for autocomplete)
      orgField.addEventListener('input', function() {
        setTimeout(function() {
          filterDepartmentsByOrganization(orgField.value);
        }, 100);
      });

      // Initial filtering if organization already has value
      if (orgField.value) {
        filterDepartmentsByOrganization(orgField.value);
      }
    })
    .catch(error => console.error("Error loading affiliation data:", error));

  // Function to filter departments based on selected organization
  function filterDepartmentsByOrganization(organization) {
    console.log("Filtering departments for:", organization);

    // Clear department field
    deptField.value = '';

    if (!organization || !affiliationData) {
      return;
    }

    try {
      // Get departments for selected organization
      const orgData = affiliationData.organizations[organization];
      const departments = orgData && orgData.departments ? Object.keys(orgData.departments) : [];

      console.log(`Found ${departments.length} departments for ${organization}`);

      // Store departments in hidden container
      hiddenContainer.setAttribute('data-departments', JSON.stringify(departments));

      // Replace the department autocomplete
      if (window.autoComplete) {
        // Clean up existing instance if any
        if (deptField._autocomplete && typeof deptField._autocomplete.destroy === 'function') {
          deptField._autocomplete.destroy();
        }

        // Create new autocomplete for departments that only shows filtered departments
        deptField._autocomplete = new autoComplete({
          selector: deptField,
          minChars: 0,
          source: function(term, suggest) {
            // Get filtered departments from hidden container
            const departments = JSON.parse(hiddenContainer.getAttribute('data-departments') || '[]');

            // Match filtered departments with search term
            term = term.toLowerCase();
            const matches = [];

            for (let i = 0; i < departments.length; i++) {
              if (departments[i].toLowerCase().indexOf(term) !== -1) {
                matches.push(departments[i]);
              }
            }

            suggest(matches);
          }
        });

        // Show dropdown when focusing on empty department field
        deptField.addEventListener('focus', function() {
          if (this.value === '') {
            const event = new Event('input');
            this.dispatchEvent(event);
          }
        });

        // Update placeholder to make filtering clear to users
        deptField.placeholder = organization ?
          `Departments for ${organization}` :
          "Select organization first";
      }
    } catch (e) {
      console.error("Error filtering departments:", e);
    }
  }
}