function getAge() {
  const today = new Date();
  const birthYear = 2014;
  return today.getFullYear() - birthYear;
}

document.addEventListener("DOMContentLoaded", function () {
  const ageEl = document.getElementById("age");
  if (ageEl) {
    ageEl.textContent = getAge();
  }
});
