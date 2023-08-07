$(document).ready(function () {
    var tableData = Array.from(document.querySelector(".table tbody").rows).map((row) => {
        var cells = row.cells;
        var rowData = {};
        rowData.type = cells[0].textContent;
        rowData.seats = cells[1].textContent;
        rowData.smoking = cells[2].textContent;
        rowData.availability = cells[3].textContent;
        rowData.lease = cells[4].textContent;
        rowData.price = cells[5].textContent;
        rowData.hasAirConditioner = cells[6].textContent;
        rowData.printer = cells[7].textContent;
        rowData.landline = cells[8].textContent;
        rowData.hasOnsiteGym = cells[9].textContent;
        rowData.parking = cells[10].textContent;
        rowData.publicTrans = cells[11].textContent;
        rowData.address = cells[12].textContent;
        rowData.imageUrl = cells[13].getElementsByTagName("img")[0].src;
        rowData.avgRating = cells[14].textContent;
        return rowData;
    });

    $('#searchForm').on('submit', function(e) {
        e.preventDefault();

        var addressSearch = $('#address').val().toLowerCase();

        var filteredData = tableData.filter((row) => {
            var matchAddress = row.address.toLowerCase().includes(addressSearch);
            return matchAddress;
        });

        var tbody = document.querySelector(".table tbody");
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }

        filteredData.forEach((rowData, index) => {
            var row = document.createElement("tr");
            if (index % 2 !== 0) {  // Add the 'odd-row' class to odd rows
                row.className = 'odd-row';
            }
            row.innerHTML = `
                <td>${rowData.type}</td>
                <td>${rowData.seats}</td>
                <td>${rowData.smoking}</td>
                <td>${rowData.availability}</td>
                <td>${rowData.lease}</td>
                <td>${rowData.price}</td>
                <td>${rowData.hasAirConditioner}</td>
                <td>${rowData.printer}</td>
                <td>${rowData.landline}</td>
                <td>${rowData.hasOnsiteGym}</td>
                <td>${rowData.parking}</td>
                <td>${rowData.publicTrans}</td>
                <td>${rowData.address}</td>
                <td><img src="${rowData.imageUrl}" alt="No image for ${rowData.type}" style="width: 50px; height: 50px;"></td>
                <td>${rowData.avgRating}</td>
                `;
            tbody.appendChild(row);
        });
    });
});
