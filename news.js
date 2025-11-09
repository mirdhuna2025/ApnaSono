// Automatically run search for "Sono Village today news"
window.onload = function() {
  const query = "sono jhajha jamui";
  const searchBox = document.querySelector(".gcse-searchresults-only");
  if (window.google && window.google.search && window.google.search.cse) {
    google.search.cse.element.getElement('searchresults-only0').execute(query);
  } else {
    // If Google CSE not yet loaded, retry after small delay
    const check = setInterval(() => {
      if (window.google && window.google.search && window.google.search.cse) {
        google.search.cse.element.getElement('searchresults-only0').execute(query);
        clearInterval(check);
      }
    }, 500);
  }
};
