// Get the filter inputs
var smokingFilter = document.getElementById("smokingFilter");
var acFilter = document.getElementById("acFilter");
var publicTransFilter = document.getElementById("publicTransFilter");
var typeCheckboxes = document.querySelectorAll("#typefilter .btn-check"); // Note the id change here

// Add an event listener to filter the table whenever the selected option changes
smokingFilter.addEventListener("change", filterTable);
acFilter.addEventListener("change", filterTable);
publicTransFilter.addEventListener("change", filterTable);
typeCheckboxes.forEach(function (checkbox) {
  checkbox.addEventListener("change", filterTable);
});

function filterTable() {
  var rows = document.querySelector(".table").rows;

  // Get the selected types from the checkboxes
  var selectedTypes = Array.from(typeCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  for (let i = 1; i < rows.length; i++) {
    // Skip the header row
    var type = rows[i].getElementsByTagName("TD")[0].textContent.toLowerCase();
    var smoking = rows[i].getElementsByTagName("TD")[2].textContent;
    var ac = rows[i].getElementsByTagName("TD")[6].textContent;
    var publicTrans = rows[i].getElementsByTagName("TD")[11].textContent;

    // Check if the type is in the selected types or if no types are selected
    var typeSelected =
      selectedTypes.includes(type) || selectedTypes.length === 0;

    if (
      typeSelected &&
      (smokingFilter.value === "" || smokingFilter.value === smoking) &&
      (acFilter.value === "" || acFilter.value === ac) &&
      (publicTransFilter.value === "" ||
        publicTransFilter.value === publicTrans)
    ) {
      rows[i].style.display = ""; // Show row
    } else {
      rows[i].style.display = "none"; // Hide row
    }
  }
}
