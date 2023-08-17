// Function to parse a string into a number, if the parsing fails, it returns the original string.
function parseValue(value) {
  var parsed = Number(value);
  return isNaN(parsed) ? value : parsed;
}

// Based on the provided direction, this function returns a comparison function.
function getComparator(dir) {
  return dir === "asc"
    ? (a, b) => (a > b ? 1 : -1)
    : (a, b) => (a < b ? 1 : -1);
}

// Main function to sort a table based on the selected column (n) and direction (dir).
function sortTable(n, dir) {
  var table, rows, switching, i, x, y, shouldSwitch, cmp;
  table = document.querySelector(".table");
  switching = true;
  cmp = getComparator(dir);  // Get the comparison function

  // While loop continues as long as there's a need for switching rows for sorting
  while (switching) {
    switching = false;
    rows = table.rows;
    for (i = 1; i < rows.length - 1; i++) {
      shouldSwitch = false;

      // Compare two adjacent rows based on the 'n' column
      x = parseValue(rows[i].getElementsByTagName("TD")[n].innerHTML.trim());
      y = parseValue(rows[i + 1].getElementsByTagName("TD")[n].innerHTML.trim());

      // Check if swapping is required
      if (cmp(x, y) > 0) {
        shouldSwitch = true;
        break;
      }
    }
    
    // If swapping is required, swap the rows and mark switching as true for next iteration
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
}

// Attach click handlers to the headers for sorting
var sortDirections = {};
var headerRow = document.querySelector(".table thead tr");
var headers = Array.from(headerRow.getElementsByTagName("th"));

// Loop over each header in the table
headers.forEach((header, i) => {
  // Check if the header has a class 'num-sort' which indicates it's a sortable column
  if (header.classList.contains("num-sort")) {
    sortDirections[i] = "desc";  // Initialize the default sort direction as 'desc'
    header.addEventListener("click", function () {
      sortTable(i, sortDirections[i]);  // Call the sort function on header click
      
      // Toggle the sort direction for next sort action
      sortDirections[i] = sortDirections[i] === "desc" ? "asc" : "desc";
    });
  }
});
