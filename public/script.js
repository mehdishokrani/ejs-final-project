// script.js to get current date

// This function fetches the current date and returns it in the "YYYY-MM-DD" format.
function getCurrentDate() {
  // Create a new date object which will give us the current date and time
  const now = new Date();

  // Get the current year
  const year = now.getFullYear();

  // Get the current month. JavaScript's `getMonth()` method returns month (0-11). So, we add 1 to it.
  // We also ensure that it's a two-digit number using `padStart()`. If it's a single-digit number like 9, it will be changed to "09".
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Get the current day of the month and ensure it's two digits.
  const day = String(now.getDate()).padStart(2, "0");

  // Return the formatted date
  return `${year}-${month}-${day}`;
}
