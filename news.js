// Automatically run search for "sono jhajha jamui"
document.addEventListener('DOMContentLoaded', function () {
  const query = "sono jhajha jamui";

  const executeSearch = () => {
    try {
      // Google CSE assigns IDs like 'searchresults-only0', 'searchresults-only1', etc.
      // Using getElement() without ID fallback may fail if multiple instances exist.
      // Safer: get by class → then infer CSE ID (most reliable is waiting for element to exist)
      const cseElement = document.querySelector('.gcse-searchresults-only');
      if (!cseElement) return;

      // Attempt to get the CSE control by standard generated ID
      const cseId = cseElement.getAttribute('id') || 'searchresults-only0';
      const cseControl = window.google?.search?.cse?.element?.getElement(cseId);

      if (cseControl) {
        cseControl.execute(query);
      } else {
        console.warn("Google CSE not ready yet — retrying shortly.");
        setTimeout(executeSearch, 300);
      }
    } catch (error) {
      console.error("Error executing Google CSE search:", error);
    }
  };

  // Wait for Google CSE script to load & initialize
  const waitForCSE = () => {
    if (window.google && window.google.search && window.google.search.cse) {
      executeSearch();
    } else {
      setTimeout(waitForCSE, 300);
    }
  };

  waitForCSE();
});
