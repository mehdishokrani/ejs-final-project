// This function will parse a string into number if it's possible,
// otherwise it will return the original string.
function parseValue(value) {
  var parsed = Number(value);
  return isNaN(parsed) ? value : parsed;
}

// Returns a comparison function for the given direction.
function getComparator(dir) {
  return dir === "asc"
    ? (a, b) => (a > b ? 1 : -1)
    : (a, b) => (a < b ? 1 : -1);
}

// Sorts a table column.
function sortTable(n, dir) {
  var table, rows, switching, i, x, y, shouldSwitch, cmp;
  table = document.querySelector(".table");
  switching = true;
  cmp = getComparator(dir);

  while (switching) {
    switching = false;
    rows = table.rows;
    for (i = 1; i < rows.length - 1; i++) {
      shouldSwitch = false;
      x = parseValue(rows[i].getElementsByTagName("TD")[n].innerHTML.trim());
      y = parseValue(
        rows[i + 1].getElementsByTagName("TD")[n].innerHTML.trim()
      );

      if (cmp(x, y) > 0) {
        shouldSwitch = true;
        break;
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
}

// Attach click handlers.
var sortDirections = {};
var headerRow = document.querySelector(".table thead tr");
var headers = Array.from(headerRow.getElementsByTagName("th"));

headers.forEach((header, i) => {
  if (header.classList.contains("num-sort")) {
    sortDirections[i] = "desc";
    header.addEventListener("click", function () {
      sortTable(i, sortDirections[i]);
      sortDirections[i] = sortDirections[i] === "desc" ? "asc" : "desc";
    });
  }
});
