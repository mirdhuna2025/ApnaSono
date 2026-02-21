<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Google CSE Auto Search</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
    background: #f4f6f8;
  }
  h2 {
    margin-bottom: 15px;
  }
</style>

<!-- Google Programmable Search Engine -->
<script async src="https://cse.google.com/cse.js?cx=81f189089ee82423b"></script>

<script>
  // Query to auto-search
  const QUERY = "sono jhajha jamui";

  // This callback is officially supported
  window.__gcse = {
    callback: function () {
      try {
        const searchElement = google.search.cse.element.getElement("search");
        if (searchElement) {
          searchElement.execute(QUERY);
        }
      } catch (e) {
        console.error("CSE not ready yet", e);
      }
    }
  };
</script>
</head>

<body>

<h2>Search Results</h2>

<!-- Search box + results -->
<div class="gcse-search"></div>

</body>
</html>
