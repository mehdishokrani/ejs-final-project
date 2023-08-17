// Get input elements for filtering by smoking, AC, and public transport status
var smokingFilter = document.getElementById("smokingFilter");
var acFilter = document.getElementById("acFilter");
var publicTransFilter = document.getElementById("publicTransFilter");

// Get all checkboxes inside the "typefilter" container for workspace type filtering
var typeCheckboxes = document.querySelectorAll("#typefilter .btn-check");

// Attach event listeners to input elements. When their value changes, the filterTable function will be triggered
smokingFilter.addEventListener("change", filterTable);
acFilter.addEventListener("change", filterTable);
publicTransFilter.addEventListener("change", filterTable);
typeCheckboxes.forEach(function (checkbox) {
  checkbox.addEventListener("change", filterTable);
});

function filterTable() {
  // Get all rows of the table
  var rows = document.querySelector(".table").rows;

  // Convert the NodeList of checkboxes to an array, filter it by checked state, and map it to get their values
  var selectedTypes = Array.from(typeCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  // Start loop from 1 to skip the table header
  for (let i = 1; i < rows.length; i++) {
    // Get the corresponding data from each row's columns (type, smoking, AC, and public transport status)
    var type = rows[i].getElementsByTagName("TD")[0].textContent.toLowerCase();
    var smoking = rows[i].getElementsByTagName("TD")[2].textContent;
    var ac = rows[i].getElementsByTagName("TD")[6].textContent;
    var publicTrans = rows[i].getElementsByTagName("TD")[11].textContent;

    // Check if the type of the current row matches the selected types (or if no types are selected)
    var typeSelected = selectedTypes.includes(type) || selectedTypes.length === 0;

    // Conditionally display each row based on filter criteria
    if (
      typeSelected &&
      (smokingFilter.value === "" || smokingFilter.value === smoking) &&
      (acFilter.value === "" || acFilter.value === ac) &&
      (publicTransFilter.value === "" || publicTransFilter.value === publicTrans)
    ) {
      rows[i].style.display = ""; // Show the row if it matches all filters
    } else {
      rows[i].style.display = "none"; // Otherwise, hide the row
    }
  }
}
